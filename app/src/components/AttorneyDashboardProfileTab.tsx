import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  Plus,
  Shield,
  Star,
  Trash2,
  Upload,
  User,
} from 'lucide-react'
import { US_STATES } from '../lib/constants'
import { formatCurrency } from '../lib/formatters'
import { getApiOrigin } from '../lib/runtimeEnv'

type AttorneyDashboardProfileTabProps = {
  error: string | null
  profileLoading: boolean
  profile: any
  editing: boolean
  setEditing: (value: boolean) => void
  setProfile: (value: any) => void
  handleSaveProfile: () => void | Promise<void>
  negotiationStyle: string
  setNegotiationStyle: (value: string) => void
  riskTolerance: string
  setRiskTolerance: (value: string) => void
  handleSaveDecisionProfile: () => void | Promise<void>
  decisionProfileLoading: boolean
  licenseStatus: any
  licenseSuccess: boolean
  licenseError: string | null
  setLicenseError: (value: string | null) => void
  licenseLoading: boolean
  licenseMethod: 'state_bar_lookup' | 'manual_upload'
  setLicenseMethod: (value: 'state_bar_lookup' | 'manual_upload') => void
  licenseNumber: string
  setLicenseNumber: (value: string) => void
  licenseState: string
  setLicenseState: (value: string) => void
  selectedLicenseFile: File | null
  handleStateBarLookup: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>
  handleLicenseFileUpload: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>
  handleLicenseFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}

const parseJson = <T,>(value: unknown, fallback: T): T => {
  if (!value || typeof value !== 'string') return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export default function AttorneyDashboardProfileTab({
  error,
  profileLoading,
  profile,
  editing,
  setEditing,
  setProfile,
  handleSaveProfile,
  negotiationStyle,
  setNegotiationStyle,
  riskTolerance,
  setRiskTolerance,
  handleSaveDecisionProfile,
  decisionProfileLoading,
  licenseStatus,
  licenseSuccess,
  licenseError,
  setLicenseError,
  licenseLoading,
  licenseMethod,
  setLicenseMethod,
  licenseNumber,
  setLicenseNumber,
  licenseState,
  setLicenseState,
  selectedLicenseFile,
  handleStateBarLookup,
  handleLicenseFileUpload,
  handleLicenseFileChange,
}: AttorneyDashboardProfileTabProps) {
  const navigate = useNavigate()

  const specialties = parseJson<string[]>(profile?.specialties, [])
  const languages = parseJson<string[]>(profile?.languages, [])
  const jurisdictions = parseJson<Array<{ state: string; counties?: string[] }>>(profile?.jurisdictions, [])
  const excludedCaseTypes = parseJson<string[]>(profile?.excludedCaseTypes, [])
  const firmLocations = parseJson<Array<{ address?: string; city?: string; state?: string; zip?: string; phone?: string }>>(
    profile?.firmLocations,
    [],
  )

  const updateProfile = (patch: Record<string, unknown>) => setProfile({ ...profile, ...patch })
  const responseTimeHours = Number(profile?.responseTimeHours ?? profile?.attorney?.responseTimeHours ?? 24)
  const responseBadge = responseTimeHours <= 2
    ? 'Fast responder'
    : responseTimeHours <= 8
      ? 'Same-day replies'
      : responseTimeHours <= 24
        ? 'Replies within 24h'
        : 'Replies within a few days'

  const openLicenseFile = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setLicenseError('Authentication required. Please log in again.')
        return
      }

      const apiUrl = getApiOrigin() || 'http://localhost:4000'
      const response = await fetch(`${apiUrl}${licenseStatus.licenseFileUrl}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        setLicenseError(errorData.error || 'Failed to load license file. Please try again.')
        return
      }

      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.target = '_blank'
      link.download = licenseStatus.licenseFileName || 'license.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      setLicenseError('Failed to load license file. Please try again.')
      console.error('Error loading license file:', err)
    }
  }

  if (profileLoading && !profile) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          </div>
        ) : null}
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Profile Not Found</h3>
          <p className="mt-1 text-sm text-gray-500">Unable to load your attorney profile.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        </div>
      ) : null}

      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
          <p className="mt-1 text-sm text-gray-600">Manage your professional profile and reputation</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/firm-dashboard')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Firm Dashboard
          </button>
          <button
            type="button"
            onClick={() => setEditing(!editing)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Edit className="h-4 w-4 mr-2" />
            {editing ? 'Cancel Edit' : 'Edit Profile'}
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-32 shrink-0">
            <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User className="h-16 w-16 text-gray-400" />
              )}
            </div>
            {editing ? (
              <button className="mt-2 w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Upload className="h-4 w-4 mr-2" />
                Change Photo
              </button>
            ) : null}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-2xl font-bold text-gray-900">{profile.attorney?.name || 'Your Profile'}</h3>
              {profile.isFeatured ? (
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  <span className="text-sm font-medium text-yellow-600">Featured</span>
                </div>
              ) : null}
              {profile.boostLevel > 0 ? (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                  Boost Level {profile.boostLevel}
                </span>
              ) : null}
            </div>

            {editing ? (
              <textarea
                value={profile.bio || ''}
                onChange={(e) => updateProfile({ bio: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                rows={3}
                placeholder="Write your professional bio..."
              />
            ) : (
              <p className="text-gray-600">{profile.bio || 'No bio available. Click Edit Profile to add one.'}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {specialties.length > 0 ? specialties.map((specialty, index) => (
                <span key={`${specialty}-${index}`} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {specialty}
                </span>
              )) : <span className="text-sm text-gray-500">No specialties specified</span>}
            </div>
          </div>

          <div className="text-right">
            <div className="text-3xl font-bold text-brand-600">{Number(profile.averageRating || 0).toFixed(1)}</div>
            <div className="flex items-center justify-end">
              {[...Array(5)].map((_, index) => (
                <Star
                  key={index}
                  className={`h-4 w-4 ${index < Math.floor(profile.averageRating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <div className="text-sm text-gray-500">{profile.totalReviews} reviews</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-lg p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <Clock className="h-4 w-4 text-brand-600" />
            Response-time badge
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{responseBadge}</p>
          <p className="mt-1 text-sm text-gray-500">Currently shown to plaintiffs as about {responseTimeHours} hour(s).</p>
        </div>
        <div className="bg-white shadow rounded-lg p-5">
          <div className="text-sm font-medium text-gray-600">Verified rating</div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{Number(profile.averageRating || 0).toFixed(1)}</p>
          <p className="mt-1 text-sm text-gray-500">{profile.totalReviews || 0} total reviews displayed publicly.</p>
        </div>
        <div className="bg-white shadow rounded-lg p-5">
          <div className="text-sm font-medium text-gray-600">Profile trust signal</div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{profile.attorney?.isVerified ? 'Verified attorney' : 'Profile in review'}</p>
          <p className="mt-1 text-sm text-gray-500">Use this preview to understand how search cards present your profile.</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Negotiation Style</label>
            <select
              value={negotiationStyle}
              onChange={(e) => setNegotiationStyle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">Select style</option>
              <option value="assertive">Assertive</option>
              <option value="collaborative">Collaborative</option>
              <option value="data-driven">Data-driven</option>
              <option value="relationship-led">Relationship-led</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Risk Tolerance</label>
            <select
              value={riskTolerance}
              onChange={(e) => setRiskTolerance(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">Select tolerance</option>
              <option value="low">Low (protect downside)</option>
              <option value="balanced">Balanced</option>
              <option value="high">High (maximize upside)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Response Time Commitment (hours)</label>
            {editing ? (
              <input
                type="number"
                min={1}
                max={72}
                value={responseTimeHours}
                onChange={(e) => updateProfile({ responseTimeHours: Math.max(1, Number(e.target.value) || 24) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
              />
            ) : (
              <p className="text-gray-900">{responseTimeHours} hours</p>
            )}
            <p className="mt-1 text-xs text-gray-500">This drives the public response-time badge shown to plaintiffs.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Public Badge Preview</label>
            <div className="inline-flex items-center rounded-full bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">
              <Clock className="mr-2 h-4 w-4" />
              {responseBadge}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleSaveDecisionProfile}
            disabled={decisionProfileLoading}
            className="px-4 py-2 text-sm font-medium text-brand-700 border border-brand-200 rounded-md hover:bg-brand-50 disabled:opacity-50"
          >
            {decisionProfileLoading ? 'Saving…' : 'Save Preferences'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attorney Name</label>
                <p className="text-gray-900">{profile.attorney?.name || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900">{profile.attorney?.email || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <p className="text-gray-900">{profile.attorney?.phone || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                {editing ? (
                  <input
                    type="number"
                    value={profile.yearsExperience}
                    onChange={(e) => updateProfile({ yearsExperience: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                  />
                ) : (
                  <p className="text-gray-900">{profile.yearsExperience} years</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Languages</label>
            {editing ? (
              <div className="space-y-2">
                {languages.map((language, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={language}
                      onChange={(e) => {
                        const next = [...languages]
                        next[index] = e.target.value
                        updateProfile({ languages: JSON.stringify(next) })
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                    />
                    <button
                      onClick={() => updateProfile({ languages: JSON.stringify(languages.filter((_, i) => i !== index)) })}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => updateProfile({ languages: JSON.stringify([...languages, '']) })}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Language
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {languages.length > 0 ? languages.map((language, index) => (
                  <span key={`${language}-${index}`} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {language}
                  </span>
                )) : <span className="text-gray-500">No languages specified</span>}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Specialties</h3>
            {editing ? (
              <div className="grid grid-cols-2 gap-3">
                {['Personal Injury', 'Auto Accidents', 'Premises Liability', 'Medical Malpractice', 'Product Liability', 'Wrongful Death', 'Workers Compensation', 'Employment Law'].map((specialty) => {
                  const isSelected = specialties.includes(specialty)
                  return (
                    <label key={specialty} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          const next = isSelected
                            ? specialties.filter((value) => value !== specialty)
                            : [...specialties, specialty]
                          updateProfile({ specialties: JSON.stringify(next) })
                        }}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-gray-700">{specialty}</span>
                    </label>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {specialties.length > 0 ? specialties.map((specialty, index) => (
                  <span key={`${specialty}-${index}`} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {specialty}
                  </span>
                )) : <span className="text-gray-500">No specialties specified</span>}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Firm Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Firm Name</label>
                {editing ? (
                  <input
                    type="text"
                    value={profile.firmName || ''}
                    onChange={(e) => updateProfile({ firmName: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                    placeholder="Enter firm name"
                  />
                ) : (
                  <p className="text-gray-900">{profile.firmName || 'Not provided'}</p>
                )}
              </div>
              {firmLocations.length > 0 ? (
                <div className="space-y-2">
                  {firmLocations.map((location, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-900">{location.address}</p>
                      <p className="text-sm text-gray-600">
                        {location.city}, {location.state} {location.zip}
                      </p>
                      {location.phone ? <p className="text-sm text-gray-600">Phone: {location.phone}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Jurisdictions</h3>
            {editing ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                {US_STATES.map((state) => {
                  const isSelected = jurisdictions.some((entry) => entry.state === state.code)
                  return (
                    <label key={state.code} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          const next = isSelected
                            ? jurisdictions.filter((entry) => entry.state !== state.code)
                            : [...jurisdictions, { state: state.code, counties: [] }]
                          updateProfile({ jurisdictions: JSON.stringify(next) })
                        }}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-gray-700">{state.code}</span>
                    </label>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {jurisdictions.length > 0 ? jurisdictions.map((entry, index) => (
                  <span key={`${entry.state}-${index}`} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {US_STATES.find((state) => state.code === entry.state)?.name || entry.state}
                  </span>
                )) : <span className="text-gray-500">No jurisdictions specified</span>}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Case Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Injury Severity (0-4)</label>
                {editing ? (
                  <input
                    type="number"
                    min="0"
                    max="4"
                    value={profile.minInjurySeverity ?? ''}
                    onChange={(e) => updateProfile({ minInjurySeverity: e.target.value ? parseInt(e.target.value, 10) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                    placeholder="0"
                  />
                ) : (
                  <p className="text-gray-900">{profile.minInjurySeverity != null ? profile.minInjurySeverity : 'No minimum'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Damages Range</label>
                {editing ? (
                  <input
                    type="number"
                    value={profile.minDamagesRange ?? ''}
                    onChange={(e) => updateProfile({ minDamagesRange: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                    placeholder="$0"
                  />
                ) : (
                  <p className="text-gray-900">{profile.minDamagesRange ? formatCurrency(profile.minDamagesRange) : 'No minimum'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Damages Range</label>
                {editing ? (
                  <input
                    type="number"
                    value={profile.maxDamagesRange ?? ''}
                    onChange={(e) => updateProfile({ maxDamagesRange: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                    placeholder="No limit"
                  />
                ) : (
                  <p className="text-gray-900">{profile.maxDamagesRange ? formatCurrency(profile.maxDamagesRange) : 'No limit'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Excluded Case Types</label>
                {editing ? (
                  <div className="grid grid-cols-2 gap-2">
                    {['auto', 'slip_and_fall', 'dog_bite', 'medmal', 'product', 'nursing_home_abuse', 'wrongful_death', 'high_severity_surgery'].map((caseType) => {
                      const isExcluded = excludedCaseTypes.includes(caseType)
                      return (
                        <label key={caseType} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isExcluded}
                            onChange={() => {
                              const next = isExcluded
                                ? excludedCaseTypes.filter((value) => value !== caseType)
                                : [...excludedCaseTypes, caseType]
                              updateProfile({ excludedCaseTypes: JSON.stringify(next) })
                            }}
                            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          />
                          <span className="text-sm text-gray-700">{caseType.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</span>
                        </label>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {excludedCaseTypes.length > 0 ? excludedCaseTypes.map((caseType, index) => (
                      <span key={`${caseType}-${index}`} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {caseType.replace(/_/g, ' ')}
                      </span>
                    )) : <span className="text-gray-500">No exclusions</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Capacity Signals</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Cases Per Week</label>
                {editing ? (
                  <input
                    type="number"
                    min="0"
                    value={profile.maxCasesPerWeek ?? ''}
                    onChange={(e) => updateProfile({ maxCasesPerWeek: e.target.value ? parseInt(e.target.value, 10) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                  />
                ) : (
                  <p className="text-gray-900">{profile.maxCasesPerWeek != null ? profile.maxCasesPerWeek : 'No limit'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Cases Per Month</label>
                {editing ? (
                  <input
                    type="number"
                    min="0"
                    value={profile.maxCasesPerMonth ?? ''}
                    onChange={(e) => updateProfile({ maxCasesPerMonth: e.target.value ? parseInt(e.target.value, 10) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                  />
                ) : (
                  <p className="text-gray-900">{profile.maxCasesPerMonth != null ? profile.maxCasesPerMonth : 'No limit'}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Intake Hours</label>
                {editing ? (
                  <select
                    value={profile.intakeHours === '24/7' ? '24/7' : 'custom'}
                    onChange={(e) => updateProfile({ intakeHours: e.target.value === '24/7' ? '24/7' : JSON.stringify([]) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                  >
                    <option value="24/7">24/7</option>
                    <option value="custom">Custom Hours</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{profile.intakeHours === '24/7' ? '24/7' : 'Custom hours'}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Buying Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Model</label>
                {editing ? (
                  <select
                    value={profile.pricingModel || ''}
                    onChange={(e) => updateProfile({ pricingModel: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                  >
                    <option value="">Select...</option>
                    <option value="fixed_price">Fixed Price</option>
                    <option value="auction">Auction</option>
                    <option value="both">Both</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{profile.pricingModel ? profile.pricingModel.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase()) : 'Not specified'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Model</label>
                {editing ? (
                  <select
                    value={profile.paymentModel || ''}
                    onChange={(e) => updateProfile({ paymentModel: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                  >
                    <option value="">Select...</option>
                    <option value="subscription">Subscription</option>
                    <option value="pay_per_case">Pay Per Case</option>
                    <option value="both">Both</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{profile.paymentModel ? profile.paymentModel.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase()) : 'Not specified'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Tier</label>
                {editing ? (
                  <select
                    value={profile.subscriptionTier || ''}
                    onChange={(e) => updateProfile({ subscriptionTier: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                  >
                    <option value="">Select...</option>
                    <option value="basic">Basic</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{profile.subscriptionTier ? profile.subscriptionTier.charAt(0).toUpperCase() + profile.subscriptionTier.slice(1) : 'Not specified'}</p>
                )}
              </div>
            </div>
          </div>

          {editing ? (
            <div className="flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={profileLoading}
                className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                {profileLoading ? 'Saving...' : 'Save All Changes'}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{profile.totalCases}</div>
            <div className="text-sm text-blue-700">Total Cases</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{Number(profile.successRate || 0).toFixed(1)}%</div>
            <div className="text-sm text-green-700">Success Rate</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(profile.averageSettlement)}</div>
            <div className="text-sm text-purple-700">Avg Settlement</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(profile.totalSettlements)}</div>
            <div className="text-sm text-yellow-700">Total Settlements</div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Attorney License</h3>
            <p className="mt-1 text-sm text-gray-600">Upload and verify your state bar license</p>
          </div>
          {licenseStatus?.licenseVerified ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-md">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">License Verified</span>
            </div>
          ) : null}
          {licenseStatus?.hasLicense && !licenseStatus?.licenseVerified ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-md">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-700">Pending Verification</span>
            </div>
          ) : null}
        </div>

        {licenseStatus?.hasLicense ? (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Current License</h4>
                {licenseStatus.licenseNumber ? <p className="text-sm text-gray-600">License Number: <span className="font-medium">{licenseStatus.licenseNumber}</span></p> : null}
                {licenseStatus.licenseState ? <p className="text-sm text-gray-600">State: <span className="font-medium">{US_STATES.find((state) => state.code === licenseStatus.licenseState)?.name || licenseStatus.licenseState}</span></p> : null}
                {licenseStatus.licenseVerificationMethod ? <p className="text-sm text-gray-600">Verification Method: <span className="font-medium capitalize">{licenseStatus.licenseVerificationMethod.replace(/_/g, ' ')}</span></p> : null}
                {licenseStatus.licenseVerifiedAt ? <p className="text-sm text-gray-600">Verified: <span className="font-medium">{new Date(licenseStatus.licenseVerifiedAt).toLocaleDateString()}</span></p> : null}
              </div>
              {licenseStatus.licenseFileUrl ? (
                <button onClick={() => void openLicenseFile()} className="text-brand-600 hover:text-brand-800 text-sm font-medium inline-flex items-center">
                  <Eye className="h-4 w-4 mr-1" />
                  View License
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {licenseSuccess ? (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-sm text-green-700 font-medium">
                {licenseMethod === 'state_bar_lookup'
                  ? 'License verified successfully via state bar lookup!'
                  : 'License file uploaded successfully! It will be reviewed by our team.'}
              </p>
            </div>
          </div>
        ) : null}

        {licenseError ? (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600 font-medium">{licenseError}</p>
          </div>
        ) : null}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Verification Method</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setLicenseMethod('state_bar_lookup')}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                licenseMethod === 'state_bar_lookup' ? 'border-brand-600 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900 mb-1">State Bar Lookup</div>
              <div className="text-sm text-gray-500">Automatically verify your license using state bar records</div>
            </button>
            <button
              type="button"
              onClick={() => setLicenseMethod('manual_upload')}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                licenseMethod === 'manual_upload' ? 'border-brand-600 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900 mb-1">Manual Upload</div>
              <div className="text-sm text-gray-500">Upload a copy of your license document</div>
            </button>
          </div>
        </div>

        {licenseMethod === 'state_bar_lookup' ? (
          <form onSubmit={handleStateBarLookup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Number *</label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                placeholder="Enter your state bar license number"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
              <select
                value={licenseState}
                onChange={(e) => setLicenseState(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                required
              >
                <option value="">Select a state</option>
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={licenseLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {licenseLoading ? 'Verifying...' : 'Verify License'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLicenseFileUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License File *</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label
                      htmlFor="license-file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-brand-600 hover:text-brand-500 focus-within:outline-none"
                    >
                      <span>Upload a file</span>
                      <input
                        id="license-file-upload"
                        name="license-file-upload"
                        type="file"
                        className="sr-only"
                        accept=".pdf,.jpg,.jpeg,.png,.gif"
                        onChange={handleLicenseFileChange}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PDF, PNG, JPG, GIF up to 10MB</p>
                  {selectedLicenseFile ? <p className="text-sm text-gray-700 mt-2">Selected: {selectedLicenseFile.name}</p> : null}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Number (Optional)</label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
                placeholder="Enter your license number if known"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State (Optional)</label>
              <select
                value={licenseState}
                onChange={(e) => setLicenseState(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="">Select a state</option>
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={licenseLoading || !selectedLicenseFile}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {licenseLoading ? 'Uploading...' : 'Upload License'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
