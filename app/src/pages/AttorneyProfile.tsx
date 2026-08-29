import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  User,
  Star,
  Award,
  TrendingUp,
  DollarSign,
  Upload,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Search,
  MoreVertical,
  Car,
  Building2,
  Bike,
  Scale,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Pencil,
  SlidersHorizontal,
} from 'lucide-react'
import {
  addAttorneyVerifiedVerdict,
  updateAttorneyVerifiedVerdict,
  deleteAttorneyVerifiedVerdict,
  uploadVerifiedVerdictDocument,
  uploadAttorneyProfilePhoto,
} from '../lib/api'
import { getApiOrigin } from '../lib/runtimeEnv'
import { formatSpecialty } from '../lib/constants'
import { BackButton } from '../features/shared/ui'
import AttorneyProfileOverview from '../features/attorney/AttorneyProfileOverview'
import PracticeTab from '../features/attorney/sections/PracticeTab'
import CasePreferencesTab from '../features/attorney/sections/CasePreferencesTab'
import { normalizeAttorneyProfile } from '../features/attorney/attorneyProfileModel'
import { useAttorneyProfileModel } from '../features/attorney/useAttorneyProfileModel'
import { useLanguage } from '../contexts/LanguageContext'
import { fallbackAvatar } from '../lib/avatar'

// Shared field styling for the verdict form so inputs read as real, bordered
// controls (the global .form-input rendered nearly borderless on this surface).
const VERDICT_INPUT_CLASS =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30'
const VERDICT_LABEL_CLASS = 'mb-1.5 block text-sm font-medium text-slate-700'

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
  { id: 'results', name: 'Case Results', icon: Award },
] as const

type ProfileTabId = (typeof PROFILE_TABS)[number]['id']

const isProfileTab = (value: string | null): value is ProfileTabId =>
  PROFILE_TABS.some((tab) => tab.id === value)

// Common case-result categories for the "Case Results" picker. The chosen label
// is stored verbatim as the verdict's caseType so it renders consistently.
const CASE_RESULT_TYPE_OPTIONS = [
  'Auto Accident',
  'Motorcycle Accident',
  'Truck Accident',
  'Pedestrian Accident',
  'Premises Liability',
  'Slip and Fall',
  'Medical Malpractice',
  'Product Liability',
  'Wrongful Death',
  'Dog Bite',
  'Workplace Injury',
  'Other',
]

const VENUE_SUGGESTIONS = [
  'Los Angeles County Superior Court',
  'Orange County Superior Court',
  'San Diego County Superior Court',
  'Riverside County Superior Court',
  'San Bernardino County Superior Court',
  'Sacramento County Superior Court',
  'Santa Clara County Superior Court',
  'Alameda County Superior Court',
]

// Pick a representative icon from the free-text case type.
function verdictIcon(caseType?: string) {
  const t = (caseType || '').toLowerCase()
  if (/(motorcycle|bike)/.test(t)) return Bike
  if (/(auto|vehicle|car|truck|pedestrian|collision|accident)/.test(t)) return Car
  if (/(premises|slip|trip|property|fall|workplace)/.test(t)) return Building2
  if (/(malpractice|verdict|court|liability|death)/.test(t)) return Scale
  return FileText
}

// Compact currency for stat tiles: 18400000 -> "$18.4M", 875000 -> "$875K".
function formatCompactUsd(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) {
    const m = (n / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)
    return `$${m.replace(/\.0+$/, '')}M`
  }
  if (abs >= 1_000) return `$${Math.round(n / 1000)}K`
  return `$${Math.round(n)}`
}

const VERDICT_PAGE_SIZE = 4

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
  const [verdictToDelete, setVerdictToDelete] = useState<number | null>(null)
  const [deletingVerdict, setDeletingVerdict] = useState(false)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const verdictDocInputRef = useRef<HTMLInputElement | null>(null)
  const [newVerdict, setNewVerdict] = useState({
    caseType: '',
    settlementAmount: '',
    caseDescription: '',
    date: '',
    venue: '',
    resultType: 'settlement' as 'settlement' | 'verdict',
    caseNumber: '',
  })
  // "Case Results" hub state (slide-over form + list controls).
  const [showVerdictPanel, setShowVerdictPanel] = useState(false)
  const [editingVerdict, setEditingVerdict] = useState<{ id?: string; index: number } | null>(null)
  const [verdictDoc, setVerdictDoc] = useState<File | null>(null)
  const [existingDocName, setExistingDocName] = useState<string | null>(null)
  const [savingVerdict, setSavingVerdict] = useState(false)
  const [verdictSearch, setVerdictSearch] = useState('')
  const [verdictFilter, setVerdictFilter] = useState<'all' | 'verified' | 'pending'>('all')
  const [verdictPage, setVerdictPage] = useState(1)
  const [openVerdictMenu, setOpenVerdictMenu] = useState<string | null>(null)

  // Adding a result changes the page count, so a page that no longer exists
  // would otherwise render empty.
  useEffect(() => {
    setVerdictPage(1)
  }, [activeTab])

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

  const resetVerdictForm = () => {
    setNewVerdict({
      caseType: '',
      settlementAmount: '',
      caseDescription: '',
      date: '',
      venue: '',
      resultType: 'settlement',
      caseNumber: '',
    })
    setVerdictDoc(null)
    setExistingDocName(null)
    setEditingVerdict(null)
  }

  const openAddVerdictPanel = () => {
    resetVerdictForm()
    setShowVerdictPanel(true)
  }

  const closeVerdictPanel = () => {
    setShowVerdictPanel(false)
    resetVerdictForm()
  }

  const openEditVerdictPanel = (index: number) => {
    if (!profile) return
    const verdict = profile.verifiedVerdicts[index]
    if (!verdict) return
    setNewVerdict({
      caseType: verdict.caseType || '',
      settlementAmount: String(verdict.settlementAmount ?? ''),
      caseDescription: verdict.caseDescription || verdict.description || '',
      date: verdict.date || '',
      venue: verdict.venue || '',
      resultType: verdict.resultType === 'verdict' ? 'verdict' : 'settlement',
      caseNumber: verdict.caseNumber || '',
    })
    setVerdictDoc(null)
    setExistingDocName(verdict.documentName || null)
    setEditingVerdict({ id: verdict.id, index })
    setOpenVerdictMenu(null)
    setShowVerdictPanel(true)
  }

  const submitVerdict = async () => {
    if (!profile) return
    if (!newVerdict.caseType.trim() || !newVerdict.settlementAmount) {
      setError('Case type and result amount are required.')
      return
    }
    setSavingVerdict(true)
    try {
      // Upload a freshly-attached supporting document first (if any).
      let documentUrl: string | null | undefined
      let documentName: string | null | undefined
      if (verdictDoc) {
        const uploaded = await uploadVerifiedVerdictDocument(verdictDoc)
        documentUrl = uploaded.url
        documentName = uploaded.name
      }

      const payload = {
        caseType: newVerdict.caseType.trim(),
        settlementAmount: Math.round(Number(String(newVerdict.settlementAmount).replace(/[^0-9.]/g, '')) || 0),
        caseDescription: newVerdict.caseDescription,
        date: newVerdict.date,
        venue: newVerdict.venue,
        resultType: newVerdict.resultType,
        caseNumber: newVerdict.caseNumber || null,
        ...(documentUrl ? { documentUrl, documentName } : {}),
      }

      const response = editingVerdict?.id
        ? await updateAttorneyVerifiedVerdict(editingVerdict.id, payload)
        : await addAttorneyVerifiedVerdict(payload)

      if (response?.profile) {
        setProfile(normalizeAttorneyProfile(response.profile))
      }
      setError(null)
      closeVerdictPanel()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save case result.')
    } finally {
      setSavingVerdict(false)
    }
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

  const handleDeleteVerdict = (index: number) => {
    if (!profile) return
    setVerdictToDelete(index)
  }

  const confirmDeleteVerdict = async () => {
    if (!profile || verdictToDelete === null) return
    const target = profile.verifiedVerdicts[verdictToDelete]
    if (!target?.id) {
      setError('This case result cannot be removed. Please refresh and try again.')
      return
    }
    setDeletingVerdict(true)
    try {
      const response = await deleteAttorneyVerifiedVerdict(String(target.id))
      if (response?.profile) setProfile(normalizeAttorneyProfile(response.profile))
      setError(null)
      setVerdictToDelete(null)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to remove case result.')
    } finally {
      setDeletingVerdict(false)
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
            <p className="text-gray-600">{profile.bio}</p>

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

      {activeTab === 'results' && (() => {
        const allVerdicts = profile.verifiedVerdicts || []
        const totalAmount = allVerdicts.reduce((sum, v) => sum + Number(v.settlementAmount || 0), 0)
        const practiceAreas = new Set(
          allVerdicts.map((v) => (v.caseType || '').toLowerCase().trim()).filter(Boolean)
        ).size
        const query = verdictSearch.trim().toLowerCase()
        const filtered = allVerdicts
          .map((v, i) => ({ v, i }))
          .filter(({ v }) => {
            const isVerified = v.status === 'verified'
            if (verdictFilter === 'verified' && !isVerified) return false
            if (verdictFilter === 'pending' && isVerified) return false
            if (!query) return true
            return [v.caseType, v.caseDescription, v.description, v.venue, v.caseNumber]
              .filter(Boolean)
              .some((f) => String(f).toLowerCase().includes(query))
          })
        const totalPages = Math.max(1, Math.ceil(filtered.length / VERDICT_PAGE_SIZE))
        const page = Math.min(verdictPage, totalPages)
        const paged = filtered.slice((page - 1) * VERDICT_PAGE_SIZE, page * VERDICT_PAGE_SIZE)
        const verifiedCount = allVerdicts.filter((v) => v.status === 'verified').length
        const awaitingCount = allVerdicts.filter((v) => (v.status || 'pending') === 'pending').length
        const stats = [
          { label: 'Verified', value: String(verifiedCount), Icon: Award, tint: 'bg-emerald-50 text-emerald-600' },
          { label: 'Awaiting Review', value: String(awaitingCount), Icon: FileText, tint: 'bg-slate-100 text-slate-600' },
          { label: 'Total Value', value: formatCompactUsd(totalAmount), Icon: DollarSign, tint: 'bg-emerald-50 text-emerald-600' },
          { label: 'Practice Areas', value: String(practiceAreas), Icon: TrendingUp, tint: 'bg-violet-50 text-violet-600' },
        ]
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Case Results</h3>
                <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  Showcase representative settlements and verdicts. Each one shows as self-reported until our team reviews your supporting document and verifies it.
                </p>
              </div>
              <button
                onClick={openAddVerdictPanel}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                <Plus className="h-4 w-4" />
                Add Case Result
              </button>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.tint}`}>
                      <s.Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xl font-bold leading-none text-slate-900">{s.value}</p>
                      <p className="mt-1 truncate text-xs font-medium text-slate-500">{s.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Search + filter */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={verdictSearch}
                  onChange={(e) => { setVerdictSearch(e.target.value); setVerdictPage(1) }}
                  placeholder="Search case results…"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <select
                value={verdictFilter}
                onChange={(e) => { setVerdictFilter(e.target.value as 'all' | 'verified' | 'pending'); setVerdictPage(1) }}
                className="rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-8 text-sm font-medium text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="all">All Results</option>
                <option value="verified">Verified</option>
                <option value="pending">Not yet verified</option>
              </select>
            </div>

            {/* List / empty states */}
            {allVerdicts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center">
                <Award className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-700">No case results yet</p>
                <p className="mt-1 text-sm text-slate-500">Add your first settlement or verdict to build your track record.</p>
                <button
                  onClick={openAddVerdictPanel}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  <Plus className="h-4 w-4" /> Add Case Result
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center text-sm text-slate-500">
                No results match your search.
              </div>
            ) : (
              <div className="space-y-4">
                {paged.map(({ v, i }) => {
                  const Icon = verdictIcon(v.caseType)
                  const isVerified = v.status === 'verified'
                  const isRejected = v.status === 'rejected'
                  const menuKey = String(v.id ?? i)
                  const desc = v.caseDescription || v.description || ''
                  const meta = [
                    v.resultType === 'verdict' ? 'Verdict' : 'Settlement',
                    v.venue,
                    v.date,
                  ].filter(Boolean)
                  return (
                    <div
                      key={menuKey}
                      className="relative flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-700">{v.caseType || 'Case result'}</p>
                            <p className="mt-0.5 text-2xl font-bold text-slate-900">{formatCurrency(Number(v.settlementAmount || 0))}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                isVerified
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isRejected
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {isVerified ? (
                                <CheckCircle className="h-3.5 w-3.5" />
                              ) : isRejected ? (
                                <XCircle className="h-3.5 w-3.5" />
                              ) : (
                                <User className="h-3.5 w-3.5" />
                              )}
                              {isVerified ? 'Verified' : isRejected ? 'Not verified' : 'Self-reported'}
                            </span>
                            <div className="relative">
                              <button
                                onClick={() => setOpenVerdictMenu(openVerdictMenu === menuKey ? null : menuKey)}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Result actions"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              {openVerdictMenu === menuKey && (
                                <div className="absolute right-0 z-10 mt-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                                  <button
                                    onClick={() => openEditVerdictPanel(i)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    <Pencil className="h-4 w-4" /> Edit
                                  </button>
                                  <button
                                    onClick={() => { setOpenVerdictMenu(null); handleDeleteVerdict(i) }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {meta.length > 0 && (
                          <p className="mt-1 text-xs font-medium text-slate-500">{meta.join('  •  ')}</p>
                        )}
                        {desc && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{desc}</p>}
                        {(v.caseNumber || v.documentName) && (
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                            {v.caseNumber && <span>Case #{v.caseNumber}</span>}
                            {v.documentName && (
                              <span className="inline-flex items-center gap-1">
                                <FileText className="h-3.5 w-3.5" /> {v.documentName}
                              </span>
                            )}
                          </div>
                        )}
                        {isRejected && v.reviewNote && (
                          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                            <span className="font-semibold">Not verified:</span> {v.reviewNote} Edit
                            this result or attach clearer documentation to resubmit it.
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 pt-1">
                <button
                  onClick={() => setVerdictPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setVerdictPage(p)}
                    className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium transition ${
                      p === page ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setVerdictPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )
      })()}

      {/* Add / Edit Case Result slide-over */}
      {showVerdictPanel && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => { if (!savingVerdict) closeVerdictPanel() }}
          />
          <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {editingVerdict ? 'Edit Case Result' : 'Add Case Result'}
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">Add a representative settlement or verdict to your profile.</p>
              </div>
              <button
                onClick={closeVerdictPanel}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-7 overflow-y-auto px-6 py-5">
              {/* Result details */}
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Result Details</p>
                <div>
                  <label className={VERDICT_LABEL_CLASS}>Result Type <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['settlement', 'verdict'] as const).map((rt) => (
                      <button
                        key={rt}
                        type="button"
                        onClick={() => setNewVerdict({ ...newVerdict, resultType: rt })}
                        className={`rounded-xl border px-4 py-2.5 text-sm font-semibold capitalize transition ${
                          newVerdict.resultType === rt
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {rt}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={VERDICT_LABEL_CLASS}>Case Type <span className="text-red-500">*</span></label>
                  <input
                    list="case-type-options"
                    value={newVerdict.caseType}
                    onChange={(e) => setNewVerdict({ ...newVerdict, caseType: e.target.value })}
                    className={VERDICT_INPUT_CLASS}
                    placeholder="Select or type a case type"
                    maxLength={120}
                  />
                  <datalist id="case-type-options">
                    {CASE_RESULT_TYPE_OPTIONS.filter((c) => c !== 'Other').map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className={VERDICT_LABEL_CLASS}>Result Amount <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newVerdict.settlementAmount ? Number(String(newVerdict.settlementAmount).replace(/[^0-9]/g, '')).toLocaleString('en-US') : ''}
                      onChange={(e) => setNewVerdict({ ...newVerdict, settlementAmount: e.target.value.replace(/[^0-9]/g, '') })}
                      className={`${VERDICT_INPUT_CLASS} pl-7`}
                      placeholder="2,500,000"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={VERDICT_LABEL_CLASS}>Venue (Court) <span className="text-red-500">*</span></label>
                    <input
                      list="venue-options"
                      value={newVerdict.venue}
                      onChange={(e) => setNewVerdict({ ...newVerdict, venue: e.target.value })}
                      className={VERDICT_INPUT_CLASS}
                      placeholder="County Superior Court"
                      maxLength={120}
                    />
                    <datalist id="venue-options">
                      {VENUE_SUGGESTIONS.map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className={VERDICT_LABEL_CLASS}>Resolution Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={newVerdict.date}
                      onChange={(e) => setNewVerdict({ ...newVerdict, date: e.target.value })}
                      className={VERDICT_INPUT_CLASS}
                    />
                  </div>
                </div>
              </div>

              {/* Case summary */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Case Summary</p>
                <div>
                  <label className={VERDICT_LABEL_CLASS}>Brief description of the case and outcome <span className="text-red-500">*</span></label>
                  <textarea
                    value={newVerdict.caseDescription}
                    onChange={(e) => setNewVerdict({ ...newVerdict, caseDescription: e.target.value })}
                    rows={4}
                    maxLength={500}
                    className={`${VERDICT_INPUT_CLASS} resize-y`}
                    placeholder="Describe the injuries, treatment, and outcome…"
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">{newVerdict.caseDescription.length} / 500</p>
                </div>
              </div>

              {/* Verification */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Supporting document</p>
                <p className="text-xs text-slate-500">Attach the settlement statement or order. It is stored privately, is never displayed publicly, and is what our team reads when reviewing this result — without it we cannot verify the amount.</p>
                <input
                  ref={verdictDocInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setVerdictDoc(f) }}
                />
                {verdictDoc ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="inline-flex min-w-0 items-center gap-2 text-sm text-slate-700">
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">{verdictDoc.name}</span>
                    </span>
                    <button onClick={() => setVerdictDoc(null)} className="text-slate-400 transition hover:text-red-600" aria-label="Remove document">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : existingDocName ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="inline-flex min-w-0 items-center gap-2 text-sm text-slate-700">
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">{existingDocName}</span>
                    </span>
                    <button onClick={() => verdictDocInputRef.current?.click()} className="text-xs font-medium text-brand-600 transition hover:text-brand-700">
                      Replace
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => verdictDocInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center transition hover:border-brand-300 hover:bg-brand-50/40"
                  >
                    <Upload className="h-5 w-5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">Upload supporting document</span>
                    <span className="text-xs text-slate-400">PDF, DOCX · Max 20 MB</span>
                  </button>
                )}
                <div>
                  <label className={VERDICT_LABEL_CLASS}>Case Number <span className="font-normal text-slate-400">(optional)</span></label>
                  <input
                    type="text"
                    value={newVerdict.caseNumber}
                    onChange={(e) => setNewVerdict({ ...newVerdict, caseNumber: e.target.value })}
                    className={VERDICT_INPUT_CLASS}
                    placeholder="BC123456"
                    maxLength={60}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={closeVerdictPanel}
                disabled={savingVerdict}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitVerdict}
                disabled={savingVerdict || !newVerdict.caseType.trim() || !newVerdict.settlementAmount}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingVerdict ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editingVerdict ? 'Save Changes' : 'Add Case Result'}
              </button>
            </div>
          </div>
        </div>
      )}

      {verdictToDelete !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-verdict-title"
          onClick={() => { if (!deletingVerdict) setVerdictToDelete(null) }}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 id="delete-verdict-title" className="text-base font-semibold text-gray-900">
                  Remove verdict
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Are you sure you want to remove this verdict from your profile? This action can’t be undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setVerdictToDelete(null)}
                disabled={deletingVerdict}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void confirmDeleteVerdict() }}
                disabled={deletingVerdict}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingVerdict ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
