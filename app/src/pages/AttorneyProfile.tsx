import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  User, 
  Star, 
  Award, 
  TrendingUp, 
  DollarSign, 
  Target, 
  Settings, 
  Upload, 
  Edit, 
  Plus, 
  Trash2,
  Shield,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import {
  addAttorneyVerifiedVerdict,
  getAttorneyDashboard,
  getAttorneyProfilePerformance,
  getMyAttorneyProfile,
  updateAttorneyProfile,
  uploadAttorneyProfilePhoto,
} from '../lib/api'
import { getApiOrigin } from '../lib/runtimeEnv'
import { formatSpecialty } from '../lib/constants'

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=Attorney&background=e0f2fe&color=075985'

// Stored photos can be absolute URLs (legacy) or server-relative upload paths
// (/uploads/avatars/...). Relative paths must be resolved against the API origin
// because the web app and API are served from different hosts.
function resolvePhotoUrl(photoUrl: string | null): string {
  if (!photoUrl) return DEFAULT_AVATAR
  if (/^(https?:)?\/\//.test(photoUrl) || photoUrl.startsWith('data:')) return photoUrl
  const origin = getApiOrigin()
  if (!origin) return photoUrl
  return `${origin}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`
}

interface AttorneyProfile {
  id: string
  bio: string
  photoUrl: string | null
  specialties: string[]
  languages: string[]
  yearsExperience: number
  totalCases: number
  totalSettlements: number
  averageSettlement: number
  successRate: number
  verifiedVerdicts: any[]
  isFeatured: boolean
  boostLevel: number
  totalReviews: number
  averageRating: number
  attorney?: {
    name?: string | null
    email?: string | null
  }
}

type AttorneyPerformance = {
  leadMetrics?: {
    totalLeads?: number
    acceptanceRate?: number
    conversionRate?: number
    overallConversionRate?: number
  }
  financialMetrics?: {
    feesCollectedFromPayments?: number
    averageFee?: number
    platformSpend?: number
    roi?: number
  }
  reviews?: {
    totalReviews?: number
    averageRating?: number
  }
}

type AttorneyDashboardSnapshot = {
  recentLeads?: Array<{ status?: string; submittedAt?: string }>
  activeCases?: {
    contacted?: number
    consultScheduled?: number
    retained?: number
    closed?: number
  }
  dashboard?: {
    totalLeadsReceived?: number
    totalLeadsAccepted?: number
    feesCollectedFromPayments?: number
  }
}

export default function AttorneyProfile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<AttorneyProfile | null>(null)
  const [performance, setPerformance] = useState<AttorneyPerformance | null>(null)
  const [dashboard, setDashboard] = useState<AttorneyDashboardSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [editing, setEditing] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const [newVerdict, setNewVerdict] = useState({
    caseType: '',
    settlementAmount: '',
    caseDescription: '',
    date: '',
    venue: ''
  })

  useEffect(() => {
    void loadProfile({ initial: true })
    const intervalId = window.setInterval(() => {
      void loadProfile({ initial: false })
    }, 30000)
    return () => window.clearInterval(intervalId)
  }, [])

  const parseJsonArray = (value: unknown): any[] => {
    if (Array.isArray(value)) return value
    if (typeof value !== 'string' || !value.trim()) return []
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const normalizeProfile = (raw: any): AttorneyProfile => {
    // The profile record has its own `specialties` column that defaults to "[]",
    // while the values chosen at registration are stored on `attorney.specialties`.
    // A plain `??` never fell back because "[]" is a defined value, so the
    // registered service types were masked by the default (#68). Prefer the
    // profile list only when it actually has entries, else use the attorney's.
    const profileSpecialties = parseJsonArray(raw?.specialties)
    const attorneySpecialties = parseJsonArray(raw?.attorney?.specialties)
    const specialties = profileSpecialties.length ? profileSpecialties : attorneySpecialties
    const languages = parseJsonArray(raw?.languages)
    const verifiedVerdicts = parseJsonArray(raw?.verifiedVerdicts)
    const totalSettlements = Number(raw?.totalSettlements || 0)
    const totalCases = Number(raw?.totalCases || 0)

    return {
      id: raw?.id || raw?.attorneyId || 'profile',
      bio: raw?.bio || raw?.attorney?.profile || '',
      photoUrl: raw?.photoUrl || null,
      specialties: specialties.length ? specialties : ['Personal Injury'],
      languages: languages.length ? languages : ['English'],
      yearsExperience: Number(raw?.yearsExperience || 0),
      totalCases,
      totalSettlements,
      averageSettlement: Number(raw?.averageSettlement || (totalCases > 0 ? totalSettlements / totalCases : 0)),
      successRate: Number(raw?.successRate || 0),
      verifiedVerdicts,
      isFeatured: Boolean(raw?.isFeatured),
      boostLevel: Number(raw?.boostLevel || 0),
      totalReviews: Number(raw?.totalReviews || raw?.attorney?.totalReviews || 0),
      averageRating: Number(raw?.averageRating || raw?.attorney?.averageRating || 0),
      attorney: raw?.attorney,
    }
  }

  const loadProfile = async ({ initial }: { initial: boolean }) => {
    try {
      if (initial) setLoading(true)
      else setRefreshing(true)
      setError(null)
      const [profileData, performanceData, dashboardData] = await Promise.all([
        getMyAttorneyProfile(),
        getAttorneyProfilePerformance({ period: 'monthly' }).catch(() => null),
        getAttorneyDashboard().catch(() => null),
      ])

      const normalized = normalizeProfile(profileData)
      if (performanceData?.reviews) {
        normalized.totalReviews = Number(performanceData.reviews.totalReviews ?? normalized.totalReviews)
        normalized.averageRating = Number(performanceData.reviews.averageRating ?? normalized.averageRating)
      }
      if (performanceData?.leadMetrics) {
        normalized.totalCases = Number(performanceData.leadMetrics.totalLeads ?? normalized.totalCases)
        normalized.successRate = Number(performanceData.leadMetrics.conversionRate ?? normalized.successRate)
      }
      if (performanceData?.financialMetrics) {
        normalized.totalSettlements = Number(performanceData.financialMetrics.feesCollectedFromPayments ?? normalized.totalSettlements)
        normalized.averageSettlement = Number(performanceData.financialMetrics.averageFee ?? normalized.averageSettlement)
      }

      setProfile(normalized)
      setPerformance(performanceData)
      setDashboard(dashboardData as unknown as AttorneyDashboardSnapshot | null)
      setLastUpdatedAt(new Date())
    } catch (err: any) {
      console.error('Failed to load profile:', err)
      setError(err?.response?.data?.error || 'Failed to load live attorney profile.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    try {
      const cleanLanguages = profile.languages.map((l) => l.trim()).filter(Boolean)
      const updated = await updateAttorneyProfile({
        name: profile.attorney?.name || undefined,
        bio: profile.bio,
        photoUrl: profile.photoUrl,
        specialties: JSON.stringify(profile.specialties),
        languages: JSON.stringify(cleanLanguages),
        yearsExperience: profile.yearsExperience,
        totalCases: profile.totalCases,
        totalSettlements: profile.totalSettlements,
        averageSettlement: profile.averageSettlement,
        successRate: profile.successRate,
        verifiedVerdicts: profile.verifiedVerdicts,
      })
      setProfile(normalizeProfile(updated))
      setLastUpdatedAt(new Date())
      setEditing(false)
      setError(null)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save profile changes.')
    }
  }

  const handleAddVerdict = async () => {
    // Add new verified verdict
    if (newVerdict.caseType && newVerdict.settlementAmount) {
      try {
        const response = await addAttorneyVerifiedVerdict({
          caseType: newVerdict.caseType,
          settlementAmount: parseInt(newVerdict.settlementAmount, 10),
          caseDescription: newVerdict.caseDescription,
          date: newVerdict.date,
          venue: newVerdict.venue,
        })

        if (response?.profile) {
          setProfile(normalizeProfile(response.profile))
        } else if (profile) {
          setProfile({
            ...profile,
            verifiedVerdicts: [...profile.verifiedVerdicts, response?.verdict].filter(Boolean)
          })
        }
        setLastUpdatedAt(new Date())
        setError(null)
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to add verified verdict.')
        return
      }
      
      setNewVerdict({
        caseType: '',
        settlementAmount: '',
        caseDescription: '',
        date: '',
        venue: ''
      })
    }
  }

  const persistVerdicts = async (verdicts: any[]) => {
    if (!profile) return
    const updated = await updateAttorneyProfile({
      bio: profile.bio,
      photoUrl: profile.photoUrl,
      specialties: JSON.stringify(profile.specialties),
      languages: JSON.stringify(profile.languages),
      yearsExperience: profile.yearsExperience,
      totalCases: profile.totalCases,
      totalSettlements: profile.totalSettlements,
      averageSettlement: profile.averageSettlement,
      successRate: profile.successRate,
      verifiedVerdicts: verdicts,
    })
    setProfile(normalizeProfile(updated))
    setLastUpdatedAt(new Date())
  }

  const handlePhotoFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Reset the input so selecting the same file again re-triggers onChange.
    event.target.value = ''
    if (!file || !profile) return

    if (!file.type.startsWith('image/')) {
      setError('Profile photo must be an image (JPEG, PNG, GIF, or WebP).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Profile photo must be 5MB or smaller.')
      return
    }

    try {
      setUploadingPhoto(true)
      setError(null)
      const updated = await uploadAttorneyProfilePhoto(file)
      setProfile(normalizeProfile(updated))
      setLastUpdatedAt(new Date())
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to upload profile photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleEditVerdict = async (index: number) => {
    if (!profile) return
    const verdict = profile.verifiedVerdicts[index]
    if (!verdict) return
    setNewVerdict({
      caseType: verdict.caseType || '',
      settlementAmount: String(verdict.settlementAmount ?? ''),
      caseDescription: verdict.description || verdict.caseDescription || '',
      date: verdict.date || '',
      venue: verdict.venue || '',
    })
    setActiveTab('verdicts')
    try {
      await persistVerdicts(profile.verifiedVerdicts.filter((_, i) => i !== index))
      setError(null)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load verdict for editing.')
    }
  }

  const handleDeleteVerdict = async (index: number) => {
    if (!profile) return
    if (!window.confirm('Remove this verdict from your profile?')) return
    try {
      await persistVerdicts(profile.verifiedVerdicts.filter((_, i) => i !== index))
      setError(null)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to remove verdict.')
    }
  }

  const currentYear = new Date().getFullYear()
  const recentLeads = dashboard?.recentLeads || []
  const totalCases = dashboard?.dashboard?.totalLeadsReceived ?? performance?.leadMetrics?.totalLeads ?? profile?.totalCases ?? 0
  const casesThisYear: number | null = recentLeads.length
    ? recentLeads.filter((lead) => {
        const submittedAt = lead.submittedAt ? new Date(lead.submittedAt) : null
        return submittedAt && !Number.isNaN(submittedAt.getTime()) && submittedAt.getFullYear() === currentYear
      }).length
    : null
  const activeCases =
    recentLeads.filter((lead) => ['contacted', 'consulted', 'retained'].includes(lead.status || '')).length ||
    (dashboard?.activeCases?.contacted ?? 0) +
      (dashboard?.activeCases?.consultScheduled ?? 0) +
      (dashboard?.activeCases?.retained ?? 0)
  const totalSettlements = performance?.financialMetrics?.feesCollectedFromPayments ?? dashboard?.dashboard?.feesCollectedFromPayments ?? profile?.totalSettlements ?? 0
  const averageSettlement = performance?.financialMetrics?.averageFee ?? profile?.averageSettlement ?? 0
  const largestSettlement = profile?.verifiedVerdicts?.reduce((max, verdict) => Math.max(max, Number(verdict.settlementAmount || 0)), 0) || averageSettlement
  const successRate = performance?.leadMetrics?.conversionRate ?? profile?.successRate ?? 0
  const clientSatisfaction = profile?.averageRating ?? 0
  const repeatClientRate = performance?.leadMetrics?.acceptanceRate ?? 0

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
        <p className="ml-4 text-lg text-gray-600">Loading your profile...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Profile Not Found</h3>
        <p className="mt-1 text-sm text-gray-500">Unable to load your attorney profile.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Attorney Profile</h1>
          <p className="mt-2 text-gray-600">
            Manage your professional profile and reputation
            {lastUpdatedAt ? (
              <span className="ml-2 text-xs text-gray-400">
                Live data updated {lastUpdatedAt.toLocaleTimeString()}
                {refreshing ? ' - refreshing...' : ''}
              </span>
            ) : null}
          </p>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={() => setEditing(!editing)}
            className="btn-secondary"
          >
            <Edit className="h-4 w-4 mr-2" />
            {editing ? 'Cancel Edit' : 'Edit Profile'}
          </button>
          <button className="btn-primary" onClick={() => navigate('/attorney-preferences')}>
            <Settings className="h-4 w-4 mr-2" />
            Profile Settings
          </button>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="card">
        <div className="flex items-start space-x-6">
          <div className="flex-shrink-0">
            <img
              src={resolvePhotoUrl(profile.photoUrl)}
              alt="Profile"
              className="h-32 w-32 rounded-full object-cover"
            />
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handlePhotoFileSelected}
            />
            {editing && (
              <button
                className="mt-2 w-full btn-secondary text-sm disabled:opacity-50 inline-flex items-center justify-center"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
              </button>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {editing ? (
                <input
                  type="text"
                  value={profile.attorney?.name || ''}
                  onChange={(e) => setProfile({ ...profile, attorney: { ...profile.attorney, name: e.target.value } })}
                  className="text-2xl font-bold text-gray-900 border border-gray-300 rounded-md px-2 py-1"
                  placeholder="Your name"
                />
              ) : (
                <h2 className="text-2xl font-bold text-gray-900">{profile.attorney?.name || 'Your Profile'}</h2>
              )}
              {profile.isFeatured && (
                <div className="flex items-center space-x-1">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-600">Featured</span>
                </div>
              )}
              {profile.boostLevel > 0 ? (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                  Boost Level {profile.boostLevel}
                </span>
              ) : null}
            </div>
            {editing ? (
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Write your professional bio..."
              />
            ) : (
              <p className="text-gray-600">{profile.bio}</p>
            )}
            
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.specialties.map((specialty, index) => (
                <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {formatSpecialty(specialty)}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary-600">{profile.averageRating}</div>
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < Math.floor(profile.averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
              ))}
            </div>
            <div className="text-sm text-gray-500">{profile.totalReviews} reviews</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: User },
            { id: 'performance', name: 'Performance', icon: TrendingUp },
            { id: 'verdicts', name: 'Verified Verdicts', icon: Award }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                  {editing ? (
                    <input
                      type="number"
                      value={profile.yearsExperience}
                      onChange={(e) => setProfile({ ...profile, yearsExperience: parseInt(e.target.value) })}
                      className="form-input"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.yearsExperience} years</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Languages</label>
                  {editing ? (
                    <div className="space-y-2">
                      {profile.languages.map((language, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={language}
                            autoFocus={!language.trim()}
                            placeholder="e.g., Spanish"
                            onChange={(e) => {
                              const newLanguages = [...profile.languages]
                              newLanguages[index] = e.target.value
                              setProfile({ ...profile, languages: newLanguages })
                            }}
                            className="form-input flex-1"
                          />
                          <button
                            onClick={() => {
                              const newLanguages = profile.languages.filter((_, i) => i !== index)
                              setProfile({ ...profile, languages: newLanguages })
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          if (profile.languages.some((l) => !l.trim())) return
                          setProfile({ ...profile, languages: [...profile.languages, ''] })
                        }}
                        className="btn-secondary text-sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Language
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {profile.languages.filter((l) => l.trim()).map((language, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {language}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {editing && (
                  <div className="pt-4">
                    <button onClick={handleSaveProfile} className="btn-primary">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{totalCases}</div>
                  <div className="text-sm text-blue-700">Total Cases</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{formatPercentage(successRate)}</div>
                  <div className="text-sm text-green-700">Success Rate</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{formatCurrency(averageSettlement)}</div>
                  <div className="text-sm text-purple-700">Avg Settlement</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalSettlements)}</div>
                  <div className="text-sm text-yellow-700">Total Settlements</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Case Volume</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Cases</span>
                  <span className="font-semibold">{totalCases}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cases This Year</span>
                  <span className="font-semibold">{casesThisYear ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Cases</span>
                  <span className="font-semibold">{activeCases}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Settlements</span>
                  <span className="font-semibold">{formatCurrency(totalSettlements)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Settlement</span>
                  <span className="font-semibold">{formatCurrency(averageSettlement)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Largest Settlement</span>
                  <span className="font-semibold">{formatCurrency(largestSettlement)}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Success Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Success Rate</span>
                  <span className="font-semibold">{formatPercentage(successRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Client Satisfaction</span>
                  <span className="font-semibold">{clientSatisfaction.toFixed(1)}/5.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Repeat Clients</span>
                  <span className="font-semibold">{formatPercentage(repeatClientRate)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'verdicts' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Verified Verdicts & Settlements</h3>
            <button
              className="btn-primary"
              onClick={() => {
                setNewVerdict({ caseType: '', settlementAmount: '', caseDescription: '', date: '', venue: '' })
                document.getElementById('add-verdict-form')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Verdict
            </button>
          </div>

          {/* Add New Verdict Form */}
          <div className="card" id="add-verdict-form">
            <h4 className="text-md font-medium text-gray-900 mb-4">Add New Verdict</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Case Type</label>
                <input
                  type="text"
                  value={newVerdict.caseType}
                  onChange={(e) => setNewVerdict({ ...newVerdict, caseType: e.target.value })}
                  className="form-input"
                  placeholder="e.g., Auto Accident"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Settlement Amount</label>
                <input
                  type="number"
                  value={newVerdict.settlementAmount}
                  onChange={(e) => setNewVerdict({ ...newVerdict, settlementAmount: e.target.value })}
                  className="form-input"
                  placeholder="2500000"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Case Description</label>
                <textarea
                  value={newVerdict.caseDescription}
                  onChange={(e) => setNewVerdict({ ...newVerdict, caseDescription: e.target.value })}
                  className="form-input"
                  rows={3}
                  placeholder="Brief description of the case..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newVerdict.date}
                  onChange={(e) => setNewVerdict({ ...newVerdict, date: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                <input
                  type="text"
                  value={newVerdict.venue}
                  onChange={(e) => setNewVerdict({ ...newVerdict, venue: e.target.value })}
                  className="form-input"
                  placeholder="Los Angeles County"
                />
              </div>
            </div>
            <div className="mt-4">
              <button onClick={handleAddVerdict} className="btn-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add Verdict
              </button>
            </div>
          </div>

          {/* Verdicts List */}
          <div className="space-y-4">
            {profile.verifiedVerdicts.map((verdict, index) => (
              <div key={index} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-md font-medium text-gray-900">{verdict.caseType}</h4>
                      <span className="text-2xl font-bold text-primary-600">{formatCurrency(verdict.settlementAmount)}</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        verdict.status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {verdict.status === 'verified' ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-2">{verdict.description}</p>
                    <div className="flex space-x-4 text-sm text-gray-500">
                      <span>Date: {verdict.date}</span>
                      <span>Venue: {verdict.venue}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditVerdict(index)}
                      className="text-gray-400 hover:text-gray-600"
                      aria-label="Edit verdict"
                      title="Edit verdict"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteVerdict(index)}
                      className="text-red-400 hover:text-red-600"
                      aria-label="Remove verdict"
                      title="Remove verdict"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
