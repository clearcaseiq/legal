import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { User, Star, TrendingUp, Upload, AlertCircle, MapPin, SlidersHorizontal } from 'lucide-react'
import { uploadAttorneyProfilePhoto } from '../lib/api'
import { getApiOrigin } from '../lib/runtimeEnv'
import { formatSpecialty } from '../lib/constants'
import { BackButton } from '../features/shared/ui'
import AttorneyProfileOverview from '../features/attorney/AttorneyProfileOverview'
import PracticeTab from '../features/attorney/sections/PracticeTab'
import CasePreferencesTab from '../features/attorney/sections/CasePreferencesTab'
import { useAttorneyProfileModel } from '../features/attorney/useAttorneyProfileModel'
import { useLanguage } from '../contexts/LanguageContext'
import { fallbackAvatar } from '../lib/avatar'

// Stored photos can be absolute URLs (legacy) or server-relative upload paths
// (/uploads/avatars/...). Relative paths must be resolved against the API origin
// because the web app and API are served from different hosts.
function resolvePhotoUrl(photoUrl: string | null, name?: string | null): string {
  if (!photoUrl) return fallbackAvatar(name)
  if (/^(https?:)?\/\//.test(photoUrl) || photoUrl.startsWith('data:')) return photoUrl
  const origin = getApiOrigin()
  if (!origin) return photoUrl
  return `${origin}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`
}

/**
 * The tabs, in order. `id` doubles as the `?tab=` value so a link can point at
 * a specific section — several places in the app deep-link to case preferences.
 */
const PROFILE_TABS = [
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'practice', name: 'Practice', icon: MapPin },
  { id: 'preferences', name: 'Case Preferences', icon: SlidersHorizontal },
  { id: 'performance', name: 'Performance', icon: TrendingUp },
] as const

type ProfileTabId = (typeof PROFILE_TABS)[number]['id']

const isProfileTab = (value: string | null): value is ProfileTabId =>
  PROFILE_TABS.some((tab) => tab.id === value)

export default function AttorneyProfile() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    dashboard,
    error,
    lastUpdatedAt,
    loading,
    performance,
    profile,
    refreshing,
    reload,
    saveProfile,
    saveSuccess,
    saving,
    setError,
    setProfile,
  } = useAttorneyProfileModel()

  const tabParam = searchParams.get('tab')
  const activeTab: ProfileTabId = isProfileTab(tabParam) ? tabParam : 'profile'
  const setActiveTab = (tab: ProfileTabId) => {
    // `replace` so tabbing around doesn't fill the back button with tab changes.
    const next = new URLSearchParams(searchParams)
    next.set('tab', tab)
    setSearchParams(next, { replace: true })
  }

  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    // Show whole numbers without a trailing ".0" (e.g. "0%" not "0.0%"), but keep
    // one decimal for fractional rates (e.g. "87.5%").
    const rounded = Math.round((Number(value) || 0) * 10) / 10
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`
  }

  const handlePhotoFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Reset the input so selecting the same file again re-triggers onChange.
    event.target.value = ''
    if (!file || !profile) return

    const looksLikeImage =
      file.type.startsWith('image/') ||
      !file.type ||
      file.type === 'application/octet-stream'
    const allowedExt = /\.(jpe?g|png|gif|webp)$/i.test(file.name || '')
    if (!looksLikeImage && !allowedExt) {
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
      // The /photo endpoint returns only the AttorneyProfile record (no attorney
      // relation), so replacing the whole profile wiped the displayed name/bio.
      // Merge just the new photo URL and keep the rest of the loaded profile.
      setProfile((prev) => (prev ? { ...prev, photoUrl: updated?.photoUrl ?? prev.photoUrl } : prev))
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to upload profile photo.')
    } finally {
      setUploadingPhoto(false)
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
      {/* Back to the previous screen (New Matches, a case, wherever the attorney came from) */}
      <BackButton onClick={() => navigate(-1)} label="Back" />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">{t('common.myProfile')}</h1>
          <p className="mt-2 text-gray-600">
            Manage your professional profile and preferences
            {lastUpdatedAt ? (
              <span className="ml-2 text-xs text-gray-400">
                Live data updated {lastUpdatedAt.toLocaleTimeString()}
                {refreshing ? ' - refreshing...' : ''}
              </span>
            ) : null}
          </p>
          {/* Inline, next to the thing that failed. A save error used to replace
              the whole page, taking the unsaved edits with it. */}
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          {saveSuccess ? <p className="mt-2 text-sm font-medium text-emerald-600">Profile saved.</p> : null}
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="card">
        <div className="flex items-start space-x-6">
          <div className="flex-shrink-0">
            <img
              src={resolvePhotoUrl(profile.photoUrl, profile.attorney?.name)}
              alt="Profile"
              className="h-32 w-32 rounded-full object-cover"
            />
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
              className="hidden"
              onChange={handlePhotoFileSelected}
            />
            {/* Photo upload is independent of full-profile edit mode (CP-579). */}
            <button
              className="mt-2 w-full btn-secondary text-sm disabled:opacity-50 inline-flex items-center justify-center"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
            </button>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {/* Read-only here. Name and bio are edited on the Profile tab
                  below, so there is one place to change them and one save. */}
              <h2 className="text-2xl font-bold text-gray-900">{profile.attorney?.name || 'Your Profile'}</h2>
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
            <p className="whitespace-pre-line text-gray-600">{profile.bio}</p>

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
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {PROFILE_TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center py-2 px-1 border-b-2 font-medium text-sm ${
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
      {activeTab === 'profile' && (
        <AttorneyProfileOverview
          profile={{
            name: profile.attorney?.name || '',
            bio: profile.bio,
            photoUrl: profile.photoUrl,
            specialties: profile.specialties,
            languages: profile.languages,
            languageProficiency: profile.languageProficiency,
            licenseState: profile.licenseState,
            licenseVerified: profile.licenseVerified,
            email: profile.attorney?.email || null,
            emailVerified: profile.emailVerified,
            yearsExperience: profile.yearsExperience,
            yearsPiExperience: profile.yearsPiExperience,
            totalSettlements: profile.totalSettlements,
          }}
          onSave={async ({ name, ...draft }) => {
            const saved = await saveProfile({
              ...draft,
              attorney: { ...profile.attorney, name },
            })
            // The overview keeps its dirty state on a rejection, so the edits
            // survive a failed save and can be retried.
            if (!saved) throw new Error('Failed to save profile changes.')
          }}
        />
      )}

      {activeTab === 'practice' && (
        <PracticeTab
          profile={profile}
          saving={saving}
          onSave={(patch) => saveProfile(patch)}
          onProfileChanged={() => reload({ initial: false })}
        />
      )}

      {activeTab === 'preferences' && (
        <CasePreferencesTab profile={profile} saving={saving} onSave={(patch) => saveProfile(patch)} />
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">Quick Stats</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 p-6 lg:grid-cols-4">
              <div className="rounded-xl bg-blue-50 p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{totalCases}</div>
                <div className="mt-1 text-sm text-blue-700">Total Cases</div>
              </div>
              <div className="rounded-xl bg-green-50 p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{formatPercentage(successRate)}</div>
                <div className="mt-1 text-sm text-green-700">Success Rate</div>
              </div>
              <div className="rounded-xl bg-purple-50 p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{formatCurrency(averageSettlement)}</div>
                <div className="mt-1 text-sm text-purple-700">Avg Settlement</div>
              </div>
              <div className="rounded-xl bg-yellow-50 p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalSettlements)}</div>
                <div className="mt-1 text-sm text-yellow-700">Total Settlements</div>
              </div>
            </div>
          </div>

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
    </div>
  )
}
