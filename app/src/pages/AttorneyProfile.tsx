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
  Briefcase,
  Globe,
  GripVertical,
  Info,
} from 'lucide-react'
import {
  addAttorneyVerifiedVerdict,
  updateAttorneyVerifiedVerdict,
  uploadVerifiedVerdictDocument,
  getAttorneyDashboard,
  getAttorneyProfilePerformance,
  getMyAttorneyProfile,
  updateAttorneyProfile,
  uploadAttorneyProfilePhoto,
} from '../lib/api'
import { getApiOrigin } from '../lib/runtimeEnv'
import { formatSpecialty } from '../lib/constants'
import { BackButton } from '../features/shared/ui'
import { useLanguage } from '../contexts/LanguageContext'

// Placeholder avatar built from the attorney's own name so it shows their real
// initials (e.g. "Jane Smith" -> "JS"). Passing the literal word "Attorney" made
// ui-avatars render the first two letters of that single word as "AT".
function fallbackAvatar(name?: string | null): string {
  const label = (name || '').trim() || 'Attorney'
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&background=e0f2fe&color=075985`
}

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
  // Profile Information card: focused editors for languages and experience.
  const [showLanguageEditor, setShowLanguageEditor] = useState(false)
  const [langDraft, setLangDraft] = useState<string[]>([])
  const [editingLangIndex, setEditingLangIndex] = useState<number | null>(null)
  const [savingLanguages, setSavingLanguages] = useState(false)
  const [editingExperience, setEditingExperience] = useState(false)
  const [expDraft, setExpDraft] = useState(0)
  const [savingExperience, setSavingExperience] = useState(false)

  useEffect(() => {
    void loadProfile({ initial: true })
    // Warm the Profile Settings (preferences) chunk so navigating there from the
    // "Profile Settings" button doesn't flash the route Suspense spinner (#212).
    void import('./AttorneyPreferences')
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
    // Show whole numbers without a trailing ".0" (e.g. "0%" not "0.0%"), but keep
    // one decimal for fractional rates (e.g. "87.5%").
    const rounded = Math.round((Number(value) || 0) * 10) / 10
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    try {
      const cleanLanguages = profile.languages.map((l) => l.trim()).filter(Boolean)
      const updated = await updateAttorneyProfile({
        name: profile.attorney?.name || undefined,
        bio: profile.bio,
        photoUrl: profile.photoUrl,
        // Send raw arrays: the API JSON.stringify()s these itself. Passing a
        // pre-stringified value double-encodes it, so on reload it parses back
        // to a string (not an array) and languages/specialties silently reset.
        specialties: profile.specialties,
        languages: cleanLanguages,
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

      let response: any
      if (editingVerdict?.id) {
        response = await updateAttorneyVerifiedVerdict(editingVerdict.id, payload)
      } else if (editingVerdict) {
        // Legacy verdict without an id: replace in place then persist the array.
        const next = profile.verifiedVerdicts.map((v, i) =>
          i === editingVerdict.index ? { ...v, ...payload } : v
        )
        await persistVerdicts(next)
        setError(null)
        closeVerdictPanel()
        return
      } else {
        response = await addAttorneyVerifiedVerdict(payload)
      }

      if (response?.profile) {
        setProfile(normalizeProfile(response.profile))
      }
      setLastUpdatedAt(new Date())
      setError(null)
      closeVerdictPanel()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save case result.')
    } finally {
      setSavingVerdict(false)
    }
  }

  const persistVerdicts = async (verdicts: any[]) => {
    if (!profile) return
    const updated = await updateAttorneyProfile({
      bio: profile.bio,
      photoUrl: profile.photoUrl,
      // Send raw arrays; the API stringifies them (see handleSaveProfile).
      specialties: profile.specialties,
      languages: profile.languages,
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

  // Persist the whole profile with a few overridden fields so unrelated columns
  // aren't wiped (the API skips undefined fields but sends full arrays here).
  const persistProfileFields = async (overrides: Record<string, any>) => {
    if (!profile) return
    const updated = await updateAttorneyProfile({
      name: profile.attorney?.name || undefined,
      bio: profile.bio,
      photoUrl: profile.photoUrl,
      specialties: profile.specialties,
      languages: profile.languages,
      yearsExperience: profile.yearsExperience,
      totalCases: profile.totalCases,
      totalSettlements: profile.totalSettlements,
      averageSettlement: profile.averageSettlement,
      successRate: profile.successRate,
      ...overrides,
    })
    setProfile(normalizeProfile(updated))
    setLastUpdatedAt(new Date())
  }

  const openLanguageEditor = () => {
    if (!profile) return
    setLangDraft(profile.languages.length ? [...profile.languages] : ['English'])
    setEditingLangIndex(null)
    setShowLanguageEditor(true)
  }

  const cancelLanguageEditor = () => {
    setShowLanguageEditor(false)
    setEditingLangIndex(null)
  }

  const updateLangDraft = (index: number, value: string) => {
    setLangDraft((prev) => prev.map((l, i) => (i === index ? value : l)))
  }

  const removeLangDraft = (index: number) => {
    setLangDraft((prev) => prev.filter((_, i) => i !== index))
    setEditingLangIndex(null)
  }

  const makeLangPrimary = (index: number) => {
    setLangDraft((prev) => {
      if (index <= 0 || index >= prev.length) return prev
      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.unshift(item)
      return next
    })
  }

  const addLangDraft = () => {
    setLangDraft((prev) => {
      if (prev.some((l) => !l.trim())) return prev
      setEditingLangIndex(prev.length)
      return [...prev, '']
    })
  }

  const saveLanguages = async () => {
    const clean = langDraft.map((l) => l.trim()).filter(Boolean)
    setSavingLanguages(true)
    try {
      await persistProfileFields({ languages: clean })
      setError(null)
      setShowLanguageEditor(false)
      setEditingLangIndex(null)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save languages.')
    } finally {
      setSavingLanguages(false)
    }
  }

  const startEditExperience = () => {
    if (!profile) return
    setExpDraft(profile.yearsExperience)
    setEditingExperience(true)
  }

  const saveExperience = async () => {
    setSavingExperience(true)
    try {
      const years = Math.min(80, Math.max(0, Math.round(Number(expDraft) || 0)))
      await persistProfileFields({ yearsExperience: years })
      setError(null)
      setEditingExperience(false)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save experience.')
    } finally {
      setSavingExperience(false)
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
      setLastUpdatedAt(new Date())
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
    setDeletingVerdict(true)
    try {
      await persistVerdicts(profile.verifiedVerdicts.filter((_, i) => i !== verdictToDelete))
      setError(null)
      setVerdictToDelete(null)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to remove verdict.')
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
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="flex space-x-4">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="btn-secondary">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
              <button onClick={handleSaveProfile} className="btn-primary">
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Changes
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="btn-secondary">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </button>
              <button className="btn-primary" onClick={() => navigate('/attorney-preferences')}>
                <Settings className="h-4 w-4 mr-2" />
                {t('common.profileSettings')}
              </button>
            </>
          )}
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
              {editing ? (
                <input
                  type="text"
                  value={profile.attorney?.name || ''}
                  onChange={(e) => setProfile({ ...profile, attorney: { ...profile.attorney, name: e.target.value } })}
                  className="text-2xl font-bold text-gray-900 border border-gray-300 rounded-md px-2 py-1"
                  placeholder="Your name"
                  maxLength={120}
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
                maxLength={2000}
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
            { id: 'verdicts', name: 'Case Results', icon: Award }
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Profile Information */}
            <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <User className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Profile Information</h3>
                  <p className="mt-0.5 text-sm text-slate-500">Update your profile details and languages spoken.</p>
                </div>
              </div>

              <div className="space-y-6 p-6">
                {/* Summary tiles */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Experience */}
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <Briefcase className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-500">Experience</p>
                        {editingExperience ? (
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={80}
                              step={1}
                              value={expDraft}
                              autoFocus
                              onChange={(e) => setExpDraft(Math.min(80, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                              className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-lg font-bold text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                            />
                            <button
                              onClick={saveExperience}
                              disabled={savingExperience}
                              className="rounded-lg bg-brand-600 p-1.5 text-white transition hover:bg-brand-700 disabled:opacity-50"
                              aria-label="Save experience"
                            >
                              {savingExperience ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => setEditingExperience(false)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              aria-label="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="mt-0.5 flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-slate-900">{profile.yearsExperience}</p>
                            <span className="text-sm text-slate-500">Years of Practice</span>
                            <button
                              onClick={startEditExperience}
                              className="ml-auto rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              aria-label="Edit experience"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Languages summary */}
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <Globe className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-500">Languages</p>
                          {!showLanguageEditor && (
                            <button
                              onClick={openLanguageEditor}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              Edit Languages
                            </button>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {profile.languages.filter((l) => l.trim()).length === 0 ? (
                            <span className="text-sm text-slate-400">No languages added</span>
                          ) : (
                            profile.languages.filter((l) => l.trim()).map((language, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                              >
                                {language}
                                {index === 0 && <CheckCircle className="h-3 w-3" />}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spoken Languages editor */}
                {showLanguageEditor && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                    <h4 className="text-sm font-semibold text-slate-900">Spoken Languages</h4>
                    <p className="mt-0.5 text-sm text-slate-500">Add the languages you speak fluently. The first is your primary.</p>

                    <div className="mt-4 space-y-2">
                      {langDraft.map((lang, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                        >
                          <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
                          {editingLangIndex === index ? (
                            <input
                              type="text"
                              value={lang}
                              autoFocus
                              placeholder="e.g., Spanish"
                              maxLength={40}
                              onChange={(e) => updateLangDraft(index, e.target.value)}
                              onBlur={() => setEditingLangIndex(null)}
                              onKeyDown={(e) => { if (e.key === 'Enter') setEditingLangIndex(null) }}
                              className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm font-medium text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                            />
                          ) : (
                            <span className="flex-1 truncate text-sm font-semibold text-slate-800">
                              {lang.trim() || <span className="font-normal italic text-slate-400">Untitled language</span>}
                            </span>
                          )}
                          {index === 0 && (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              Primary
                            </span>
                          )}
                          {index !== 0 && (
                            <button
                              onClick={() => makeLangPrimary(index)}
                              className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                              title="Make primary"
                            >
                              Make primary
                            </button>
                          )}
                          <button
                            onClick={() => setEditingLangIndex(index)}
                            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Rename language"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeLangDraft(index)}
                            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            aria-label="Remove language"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}

                      <button
                        onClick={addLangDraft}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-brand-600 transition hover:border-brand-300 hover:bg-brand-50/40"
                      >
                        <Plus className="h-4 w-4" />
                        Add Language
                      </button>
                    </div>

                    <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                      <button
                        onClick={cancelLanguageEditor}
                        disabled={savingLanguages}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        Discard Changes
                      </button>
                      <button
                        onClick={saveLanguages}
                        disabled={savingLanguages}
                        className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
                      >
                        {savingLanguages ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Why this matters */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Info className="h-5 w-5" />
                </span>
                <h4 className="mt-3 text-sm font-semibold text-slate-900">Why this matters</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                  A complete profile helps potential clients learn more about you and builds trust in your expertise.
                </p>
              </div>
            </div>
          </div>

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

      {activeTab === 'verdicts' && (() => {
        const allVerdicts = profile.verifiedVerdicts || []
        const verifiedCount = allVerdicts.filter((v) => v.status === 'verified').length
        const pendingCount = allVerdicts.length - verifiedCount
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
        const stats = [
          { label: 'Verified Results', value: String(verifiedCount), Icon: Shield, tint: 'bg-brand-50 text-brand-600' },
          { label: 'Pending Review', value: String(pendingCount), Icon: AlertCircle, tint: 'bg-amber-50 text-amber-600' },
          { label: 'Total Results', value: formatCompactUsd(totalAmount), Icon: DollarSign, tint: 'bg-emerald-50 text-emerald-600' },
          { label: 'Practice Areas', value: String(practiceAreas), Icon: TrendingUp, tint: 'bg-violet-50 text-violet-600' },
        ]
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Case Results</h3>
                <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  Showcase representative settlements and verdicts. Verified results help strengthen your ClearCaseIQ attorney profile.
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
                <option value="pending">Pending Review</option>
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
                                isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isVerified ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                              {isVerified ? 'Verified' : 'Pending Review'}
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
                                    <Edit className="h-4 w-4" /> Edit
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
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Verification</p>
                <p className="text-xs text-slate-500">Help us verify this result. Documents are kept private and are not displayed publicly.</p>
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
                {editingVerdict ? 'Save Changes' : 'Submit for Verification'}
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
