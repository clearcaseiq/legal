import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { listAssessments, getAssessment, getEvidenceFiles, associateAssessments, getRoutingStatus, createAppointment, getAttorneyAvailability, updateAppointment, cancelAppointment, joinAppointmentWaitlist, updateAppointmentPreparation, getPlaintiffConsentCompliance, getPlaintiffDocumentRequests, getPlaintiffSignedDocuments, getPlaintiffCaseTasks, createAttorneyReview, getMedicalChronology, updateAssessment, type PlaintiffDocumentRequest, type PlaintiffSignedDocument, type PlaintiffCaseTask } from '../lib/api'
import { formatCurrency } from '../lib/formatters'
import { formatClaimTypeShort } from '../lib/constants'
import { START_ASSESSMENT_HREF } from '../data/appRoutes'
import { canonicalClaimType } from '../lib/claimTypes'
import { formatCaseId } from '../lib/caseId'
import { dateLocale } from '../i18n'
import { localizeDocumentRequestLabel } from '../lib/documentRequestI18n'
import { CheckCircle, Upload, FileText, FileClock, TrendingUp, MessageCircle, BarChart3, FileStack, Activity, LayoutDashboard, ChevronRight, Bell, HelpCircle, Clock, Users, Calendar, Phone, Star, Sparkles, ArrowRight, ShieldCheck, Scale, Lock, ExternalLink, Copy, Check } from 'lucide-react'
import CaseProgressPipeline from '../components/CaseProgressPipeline'
import {
  getPlaintiffCaseStatusKey,
  caseStatusLabelKey,
  caseStatusColor,
  isPlaintiffRetained,
  litigationStatusLabelKey,
} from '../lib/caseStatus'
import OpposingDocSuggestionCard from '../components/OpposingDocSuggestionCard'
import PlaintiffSatisfactionCard from '../components/PlaintiffSatisfactionCard'
import { DashboardPageSkeleton, DashboardTabPanelSkeleton } from '../components/PageSkeletons'
import { getLoginRedirect } from '../lib/auth'
import { loadPlaintiffSessionSummary, updateCachedPlaintiffAssessments } from '../hooks/usePlaintiffSessionSummary'
import { useLanguage } from '../contexts/LanguageContext'
import { evidenceUploadHref, plaintiffDashboardReturnTo, rememberEvidenceReturnTo } from '../lib/evidenceUploadNav'
import DraggableFab from '../components/DraggableFab'
import { evidenceTargetForRequestKey } from '../lib/documentRequestUpload'

type TabId = 'dashboard' | 'tasks' | 'documents' | 'attorney' | 'value' | 'journal'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  _count: { assessments: number; favoriteAttorneys: number }
  createdAt: string
}

interface Assessment {
  id: string
  claimType: string
  caseName?: string | null
  reference_code?: string | null
  venue: { state: string; county?: string }
  status: string
  created_at: string
  submittedForReview?: boolean
  latest_prediction?: {
    viability: { overall: number; liability: number; causation: number; damages: number }
    value_bands: { p25: number; median: number; p75: number }
  }
}

interface ActiveAssessment {
  id: string
  claimType: string
  venue?: { state: string; county?: string }
  venueState?: string
  facts: any
  submittedForReview?: boolean
  latest_prediction?: {
    viability: { overall: number; liability: number; causation: number; damages: number }
    value_bands: { p25: number; median: number; p75: number }
  }
  caseValueUpdated?: {
    previousValue: { p25: number; median: number; p75: number }
    newValue: { p25: number; median: number; p75: number }
    reason?: string
  } | null
  caseValueHistory?: Array<{
    label: string
    shortLabel?: string
    reasonKey?: string
    value: number
    bands: { p25: number; median: number; p75: number }
    createdAt: string
  }>
}

function LinkCaseForm({ onLinked }: { onLinked: () => void }) {
  const { t } = useLanguage()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const extractId = (val: string) => {
    const trimmed = val.trim()
    const match = trimmed.match(/\/results\/([a-zA-Z0-9_-]+)/)
    if (match) return match[1]
    if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed
    return null
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = extractId(input)
    if (!id) {
      setMessage(t('plaintiffDashboard.linkCase.invalid'))
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      // A well-formed but non-existent ID associates nothing (updatedCount: 0).
      // Treat that as a failure instead of falsely reporting success (#81).
      const result = await associateAssessments([id])
      if (!result || Number(result.updatedCount) < 1) {
        setMessage(t('plaintiffDashboard.linkCase.notFound'))
        return
      }
      setMessage(t('plaintiffDashboard.linkCase.success'))
      setInput('')
      onLinked()
    } catch (err: any) {
      setMessage(err.response?.data?.error || t('plaintiffDashboard.linkCase.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('plaintiffDashboard.linkCase.placeholder')}
          className="input flex-1 bg-white text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-outline shrink-0 bg-white text-sm font-semibold disabled:opacity-50"
        >
          {loading ? t('plaintiffDashboard.linkCase.linking') : t('plaintiffDashboard.linkCase.link')}
        </button>
      </form>
      {message && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{message}</p>}
    </div>
  )
}

function plaintiffStatusMessage(message?: string | null) {
  return (message ?? '')
    .replace(/manual review/gi, 'team review')
    .replace(/human review/gi, 'team review')
}

// `labelKey` resolves to a localized string at render time (t('plaintiffDashboard.tabs.*'))
// so the tab bar follows the active language (CP-558).
const TABS: { id: TabId; labelKey: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', labelKey: 'plaintiffDashboard.tabs.dashboard', icon: <BarChart3 className="h-5 w-5" /> },
  { id: 'tasks', labelKey: 'plaintiffDashboard.tabs.tasks', icon: <CheckCircle className="h-5 w-5" /> },
  { id: 'documents', labelKey: 'plaintiffDashboard.tabs.documents', icon: <FileStack className="h-5 w-5" /> },
  { id: 'attorney', labelKey: 'plaintiffDashboard.tabs.attorney', icon: <Users className="h-5 w-5" /> },
  { id: 'value', labelKey: 'plaintiffDashboard.tabs.value', icon: <TrendingUp className="h-5 w-5" /> },
  { id: 'journal', labelKey: 'plaintiffDashboard.tabs.journal', icon: <MessageCircle className="h-5 w-5" /> },
]

/** Legacy deep-link tab ids that map onto the tightened nav. */
function resolveDashboardTab(raw: string | null, opts: { attorneyMatched: boolean }): TabId | null {
  if (!raw) return null
  if (raw === 'requested-documents') return 'tasks'
  if (raw === 'attorney' && opts.attorneyMatched) return 'dashboard'
  if (TABS.some((tab) => tab.id === raw)) return raw as TabId
  return null
}

const loadPlaintiffDashboardDeferredTabPanel = () => import('../components/PlaintiffDashboardDeferredTabPanel')
const PlaintiffDashboardDeferredTabPanel = lazy(loadPlaintiffDashboardDeferredTabPanel)

function buildUpcomingDateOptions(count = 7) {
  const options: Array<{ value: string; label: string }> = []
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  while (options.length < count) {
    const dayOfWeek = cursor.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      options.push({
        value: cursor.toISOString().slice(0, 10),
        label: cursor.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      })
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return options
}

export default function Dashboard() {
  const { t, language } = useLanguage()
  const locale = dateLocale(language)
  const localizeClaimType = (value: string | null | undefined) => {
    const key = canonicalClaimType(value)
    if (!key) return t('plaintiffDashboard.claimTypes.default')
    const translated = t(`plaintiffDashboard.claimTypes.${key}`)
    return translated.startsWith('plaintiffDashboard.claimTypes.') ? formatClaimTypeShort(value) : translated
  }
  const [user, setUser] = useState<User | null>(null)
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [activeAssessment, setActiveAssessment] = useState<ActiveAssessment | null>(null)
  const [caseIdCopied, setCaseIdCopied] = useState(false)
  const [evidenceCount, setEvidenceCount] = useState(0)
  const [evidenceFiles, setEvidenceFiles] = useState<Array<{
    id: string
    originalName?: string
    filename?: string
    category?: string
    fileUrl?: string
    createdAt?: string
    size?: number
    processingStatus?: string
  }>>([])
  const [medicalSummary, setMedicalSummary] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [painLevel, setPainLevel] = useState(5)
  const [painNote, setPainNote] = useState('')
  const [journalSaved, setJournalSaved] = useState(false)
  const [journalEntries, setJournalEntries] = useState<{ date: string; level: number; note: string; days?: number; dailyWage?: number }[]>([])
  const [journalError, setJournalError] = useState<string | null>(null)
  const [editingEntryIndex, setEditingEntryIndex] = useState<number | null>(null)
  const [wageDays, setWageDays] = useState('')
  const [wageDaily, setWageDaily] = useState('')
  const [routingStatus, setRoutingStatus] = useState<{
    lifecycleState?: string
    leadStatus?: string | null
    caseStage?: string | null
    litigationStatus?: string | null
    statusMessage?: string
    attorneysRouted?: number
    attorneysReviewing?: number
    responseDeadlineMinutes?: number
    responseDeadlineHours?: number
    responseDeadlineLabel?: string
    attorneyMatched?: {
      id: string
      name: string
      email?: string
      phone?: string
      firmName?: string
      specialties?: string
      yearsExperience?: number
      responseTimeHours?: number
      claimType?: string | null
      acceptedAt?: string | null
    }
    attorneyActivity?: { type: string; message: string; timeAgo?: string }[]
    caseMessages?: { subject: string; message: string; createdAt: string; from?: 'attorney' | 'plaintiff' }[]
    upcomingAppointment?: {
      id: string
      scheduledAt: string
      type: string
      attorney: { id?: string; name: string }
      preparation?: {
        checkInStatus?: string
        preparationNotes?: string
        prepItems?: Array<{ id: string; label: string; status: string; isRequired: boolean }>
        waitlistStatus?: string | null
      } | null
      reviewEligible?: boolean
    }
    // Top-level so the review prompt survives the consult it refers to.
    reviewEligible?: boolean
    existingReview?: { rating: number; title?: string | null; review?: string | null; createdAt: string } | null
    caseChatRoomId?: string | null
    // True when the plaintiff already had a consult on this case (API: case-routing status).
    hadPriorConsultation?: boolean
  } | null>(null)
  const responseDeadlineLabel = routingStatus?.responseDeadlineLabel || '24 hours'
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleDate, setScheduleDate] = useState(buildUpcomingDateOptions(1)[0]?.value || '')
  const [scheduleType, setScheduleType] = useState<'phone' | 'video' | 'in_person'>('phone')
  const [scheduleSlots, setScheduleSlots] = useState<Array<{ start: string; end: string; available: boolean }>>([])
  const [scheduleSlotsLoading, setScheduleSlotsLoading] = useState(false)
  const [selectedScheduleSlot, setSelectedScheduleSlot] = useState<string>('')
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null)
  const [cancelConsultOpen, setCancelConsultOpen] = useState(false)
  const [cancelConsultReason, setCancelConsultReason] = useState('')
  const [cancelConsultLoading, setCancelConsultLoading] = useState(false)
  const [prepNotes, setPrepNotes] = useState('')
  const [prepSaving, setPrepSaving] = useState(false)
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [latestNotification, setLatestNotification] = useState<string | null>(null)
  const [documentRequests, setDocumentRequests] = useState<PlaintiffDocumentRequest[]>([])
  const [signedDocuments, setSignedDocuments] = useState<PlaintiffSignedDocument[]>([])
  const [attorneyTasks, setAttorneyTasks] = useState<PlaintiffCaseTask[]>([])
  const [attorneyTasksFailed, setAttorneyTasksFailed] = useState(false)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    setPrepNotes(routingStatus?.upcomingAppointment?.preparation?.preparationNotes || '')
  }, [routingStatus?.upcomingAppointment?.id, routingStatus?.upcomingAppointment?.preparation?.preparationNotes])
  const caseIdFromUrl = searchParams.get('case')
  const tabFromUrl = searchParams.get('tab')
  // Boolean only — `attorneyMatched` is a new object on every routing poll, and
  // must not re-trigger tab sync (that was yanking users back to ?tab=documents).
  const attorneyMatchedFlag = Boolean(routingStatus?.attorneyMatched)
  // While a tab click's URL update is in flight, ignore stale ?tab= from effects.
  const pendingTabRef = useRef<TabId | null>(null)

  // Keep tab selection in the URL so deep links and in-app clicks agree. Without
  // this, clicking Journal only updates local state while ?tab=documents (common
  // after evidence-upload return) can snap the user back to Documents on the next
  // searchParams-driven effect (e.g. after saving a journal entry).
  const selectTab = useCallback(
    (tab: TabId) => {
      pendingTabRef.current = tab
      setActiveTab(tab)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (tab === 'dashboard') next.delete('tab')
          else next.set('tab', tab)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const selectCase = useCallback(
    (assessmentId: string) => {
      if (!assessmentId || assessmentId === activeAssessment?.id) return
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('case', assessmentId)
          return next
        },
        { replace: true },
      )
    },
    [activeAssessment?.id, setSearchParams],
  )

  const caseOptionLabel = useCallback(
    (assessment: Assessment) => {
      const typeLabel = localizeClaimType(assessment.claimType)
      const dateLabel = assessment.created_at
        ? new Date(assessment.created_at).toLocaleDateString(locale)
        : ''
      if (assessment.caseName?.trim()) {
        return dateLabel ? `${assessment.caseName.trim()} · ${dateLabel}` : assessment.caseName.trim()
      }
      if (assessment.reference_code) {
        return dateLabel
          ? `${typeLabel} (${assessment.reference_code}) · ${dateLabel}`
          : `${typeLabel} (${assessment.reference_code})`
      }
      return dateLabel ? `${typeLabel} · ${dateLabel}` : typeLabel
    },
    [locale, localizeClaimType],
  )

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Belt-and-suspenders: remember dashboard as the Done destination before the
  // /evidence-upload → /intake2 replace navigation can drop query params.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.('a[href*="evidence-upload"]')
      if (!anchor || !activeAssessment?.id) return
      rememberEvidenceReturnTo(plaintiffDashboardReturnTo(activeAssessment.id))
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [activeAssessment?.id])

  // Allow deep-linking via ?tab=. Legacy `requested-documents` → Tasks;
  // `attorney` → Dashboard once matched (Attorney Review tab is hidden then).
  useEffect(() => {
    const resolved = resolveDashboardTab(tabFromUrl, {
      attorneyMatched: attorneyMatchedFlag,
    })
    if (!resolved) return
    // Click already chose a tab; wait until the URL catches up before syncing.
    if (pendingTabRef.current && pendingTabRef.current !== resolved) return
    pendingTabRef.current = null
    setActiveTab((current) => (current === resolved ? current : resolved))
  }, [tabFromUrl, attorneyMatchedFlag])

  useEffect(() => {
    if (attorneyMatchedFlag && activeTab === 'attorney') {
      selectTab('dashboard')
    }
  }, [attorneyMatchedFlag, activeTab, selectTab])

  // Switching cases from the "My Cases" list only changes the ?case= query
  // param on the same route, so the initial mount-only loader never re-ran and
  // the page appeared frozen (#54). React to the param after the first load.
  useEffect(() => {
    if (!caseIdFromUrl) return
    if (!activeAssessment) return // initial selection handled by loadDashboardData
    if (caseIdFromUrl === activeAssessment.id) return
    if (!assessments.some((a) => a.id === caseIdFromUrl)) return
    let cancelled = false
    ;(async () => {
      try {
        const [detail, files, requestData, signedData] = await Promise.all([
          getAssessment(caseIdFromUrl),
          getEvidenceFiles(caseIdFromUrl).catch(() => []),
          getPlaintiffDocumentRequests(caseIdFromUrl).catch(() => ({ assessmentId: caseIdFromUrl, evidenceCount: 0, requests: [] as PlaintiffDocumentRequest[] })),
          getPlaintiffSignedDocuments(caseIdFromUrl).catch(() => ({ assessmentId: caseIdFromUrl, leadId: null, documents: [] as PlaintiffSignedDocument[] })),
        ])
        if (cancelled) return
        setActiveAssessment(detail)
        const fileList = Array.isArray(files) ? files : []
        setEvidenceCount(fileList.length)
        setEvidenceFiles(fileList)
        setDocumentRequests(Array.isArray(requestData.requests) ? requestData.requests : [])
        setSignedDocuments(Array.isArray(signedData.documents) ? signedData.documents : [])
      } catch {
        /* leave the current case in place on failure */
      }
    })()
    return () => { cancelled = true }
  }, [caseIdFromUrl, activeAssessment, assessments])

  // Surface tasks the attorney assigned to the plaintiff in the Tasks tab (#157).
  useEffect(() => {
    const assessmentId = activeAssessment?.id
    if (!assessmentId) {
      setAttorneyTasks([])
      return
    }
    let cancelled = false
    getPlaintiffCaseTasks(assessmentId)
      .then((data) => {
        if (cancelled) return
        setAttorneyTasks(Array.isArray(data?.tasks) ? data.tasks : [])
        setAttorneyTasksFailed(false)
      })
      // A failed fetch used to leave an empty list, which is exactly what "your
      // attorney hasn't assigned you anything" looks like. That ambiguity is
      // what made CP-388 hard to pin down, so say when we couldn't load them.
      .catch(() => {
        if (cancelled) return
        setAttorneyTasks([])
        setAttorneyTasksFailed(true)
      })
    return () => { cancelled = true }
  }, [activeAssessment?.id])

  // Opening Tasks runs document-request reconcile (orphaned "Request from client"
  // CaseTasks → Requested Documents) and refreshes both columns.
  useEffect(() => {
    if (activeTab !== 'tasks' || !activeAssessment?.id) return
    const assessmentId = activeAssessment.id
    let cancelled = false
    ;(async () => {
      await refreshCaseDocuments(assessmentId)
      if (cancelled) return
      try {
        const data = await getPlaintiffCaseTasks(assessmentId)
        if (cancelled) return
        setAttorneyTasks(Array.isArray(data?.tasks) ? data.tasks : [])
        setAttorneyTasksFailed(false)
      } catch {
        if (!cancelled) setAttorneyTasksFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeTab, activeAssessment?.id])

  useEffect(() => {
    if (!activeAssessment?.id) {
      setJournalEntries([])
      return
    }
      const key = `pain_journal_${activeAssessment.id}`
    let fromFacts: { date: string; level: number; note: string; days?: number; dailyWage?: number }[] = []
    try {
      const facts =
        typeof activeAssessment.facts === 'string'
          ? JSON.parse(activeAssessment.facts || '{}')
          : (activeAssessment.facts || {})
      if (Array.isArray(facts?.painJournal)) fromFacts = facts.painJournal
    } catch {
      fromFacts = []
    }
    const stored = (() => {
      try {
        const raw = JSON.parse(localStorage.getItem(key) || '[]')
        return Array.isArray(raw) ? raw : []
      } catch {
        return []
      }
    })()
    // Prefer case-file journal (visible to attorney); fall back to device cache and migrate.
    if (fromFacts.length > 0) {
      setJournalEntries(fromFacts)
      localStorage.setItem(key, JSON.stringify(fromFacts))
    } else if (stored.length > 0) {
      setJournalEntries(stored)
      void updateAssessment(activeAssessment.id, { painJournal: stored }).catch(() => {})
    } else {
      setJournalEntries([])
    }
  }, [activeAssessment?.id])

  useEffect(() => {
    if (!activeAssessment?.id) {
      setMedicalSummary([])
      return
    }

    let cancelled = false
    const loadMedicalSummary = async () => {
      try {
        const chronology = await getMedicalChronology(activeAssessment.id)
        if (cancelled) return
        setMedicalSummary(
          Array.isArray(chronology)
            ? chronology.map((event: any) => ({
                date: event.date,
                label: event.label,
                type: event.type,
                status: event.status,
                provider: event.provider,
                details: event.details,
                amount: event.amount,
                sourceFileName: event.sourceFileName,
                confidence: event.confidence || event.extractionConfidence,
              }))
            : []
        )
      } catch {
        if (!cancelled) setMedicalSummary([])
      }
    }

    void loadMedicalSummary()
    return () => {
      cancelled = true
    }
  }, [activeAssessment?.id])

  const refreshCaseDocuments = async (assessmentId: string) => {
    try {
      const [files, requestData] = await Promise.all([
        getEvidenceFiles(assessmentId).catch(() => [] as typeof evidenceFiles),
        getPlaintiffDocumentRequests(assessmentId).catch(() => ({
          assessmentId,
          evidenceCount: 0,
          requests: [] as PlaintiffDocumentRequest[],
        })),
      ])
      setEvidenceFiles(Array.isArray(files) ? files : [])
      setDocumentRequests(Array.isArray(requestData.requests) ? requestData.requests : [])
    } catch {
      /* keep current snapshot */
    }
  }

  useEffect(() => {
    if (!activeAssessment?.id) return

    let cancelled = false
    const refreshActiveAssessment = async () => {
      try {
        const detail = await getAssessment(activeAssessment.id)
        if (!cancelled) setActiveAssessment(detail)
      } catch {
        /* keep the current dashboard snapshot if refresh fails */
      }
    }
    const refreshOnReturn = () => {
      if (document.visibilityState !== 'visible') return
      void refreshActiveAssessment()
      // Supporting Documents / Tasks uploads fulfill request items via evidence
      // categories — refresh so progress bars update when the user returns.
      void refreshCaseDocuments(activeAssessment.id)
    }

    window.addEventListener('focus', refreshOnReturn)
    document.addEventListener('visibilitychange', refreshOnReturn)

    return () => {
      cancelled = true
      window.removeEventListener('focus', refreshOnReturn)
      document.removeEventListener('visibilitychange', refreshOnReturn)
    }
  }, [activeAssessment?.id])

  useEffect(() => {
    if (!activeAssessment?.id) return

    const preload = () => {
      void loadPlaintiffDashboardDeferredTabPanel()
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const idleCapableWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback) => number
      cancelIdleCallback?: (handle: number) => void
    }
    let idleId: number | null = null

    if (typeof idleCapableWindow.requestIdleCallback === 'function') {
      idleId = idleCapableWindow.requestIdleCallback(() => preload())
    } else {
      timeoutId = setTimeout(preload, 1200)
    }

    return () => {
      if (idleId !== null && typeof idleCapableWindow.cancelIdleCallback === 'function') {
        idleCapableWindow.cancelIdleCallback(idleId)
      }
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [activeAssessment?.id])

  useEffect(() => {
    const isSubmitted = !!activeAssessment?.submittedForReview
    if (!activeAssessment?.id || !isSubmitted) {
      setRoutingStatus(null)
      setLatestNotification(null)
      return
    }
    const fetchStatus = () => {
      getRoutingStatus(activeAssessment.id)
        .then((data: any) => {
          setRoutingStatus(data)
          const last = data?.attorneyActivity?.[0]
          if (last?.type === 'viewed') setLatestNotification(t('plaintiffDashboard.dynamic.notif.viewed'))
          else if (last?.type === 'accepted') setLatestNotification(t('plaintiffDashboard.dynamic.notif.accepted'))
          else if (last?.type === 'requested_info') setLatestNotification(t('plaintiffDashboard.dynamic.notif.requestedInfo'))
          else if (last?.type === 'manual_review_needed') setLatestNotification(t('plaintiffDashboard.dynamic.notif.manualReview'))
          else if (last?.type === 'plaintiff_rank_advanced') setLatestNotification(t('plaintiffDashboard.dynamic.notif.rankAdvanced'))
          else if (last?.type === 'plaintiff_rank_batch_generated') setLatestNotification(t('plaintiffDashboard.dynamic.notif.rankBatch'))
          else if (data?.statusMessage) {
            const msg = plaintiffStatusMessage(data.statusMessage)
            // The review banner already shows count + response-time copy. Skip the
            // generic routing status line so we don't show e.g. "1 attorney(s)…"
            // under "1 attorney is reviewing your case".
            const duplicatesReviewBanner =
              /\battorney\(s\)\b/i.test(msg) ||
              /\battorneys?\s+(is|are)\s+reviewing your case/i.test(msg) ||
              /\battorneys?\s+received your case/i.test(msg) ||
              /\battorneys?\s+reviewing your case/i.test(msg)
            if (!duplicatesReviewBanner) setLatestNotification(msg)
          }
        })
        .catch(() => {})
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000) // Poll every 30s for updates
    return () => clearInterval(interval)
  }, [activeAssessment?.id, activeAssessment?.submittedForReview])

  useEffect(() => {
    if (!scheduleModalOpen || !routingStatus?.attorneyMatched?.id || !scheduleDate) {
      return
    }

    setScheduleSlotsLoading(true)
    setScheduleError(null)
    getAttorneyAvailability(routingStatus.attorneyMatched.id, scheduleDate, 30)
      .then((data: any) => {
        const slots = Array.isArray(data?.slots) ? data.slots : []
        setScheduleSlots(slots)
        setSelectedScheduleSlot((current) =>
          current && slots.some((slot: { start: string }) => slot.start === current)
            ? current
            : slots[0]?.start || ''
        )
      })
      .catch((error: any) => {
        setScheduleSlots([])
        setSelectedScheduleSlot('')
        setScheduleError(error?.response?.data?.error || t('plaintiffDashboard.dynamic.scheduleLoadError'))
      })
      .finally(() => {
        setScheduleSlotsLoading(false)
      })
  }, [scheduleModalOpen, routingStatus?.attorneyMatched?.id, scheduleDate])

  const loadDashboardData = async () => {
    try {
      let assessmentsData: Assessment[] = []
      const pendingId = localStorage.getItem('pending_assessment_id') || caseIdFromUrl || undefined
      const session = await loadPlaintiffSessionSummary(Boolean(pendingId))
      const userData = session.user
      const listData = session.assessments
      if (userData?.id) {
        try {
          const compliance = await getPlaintiffConsentCompliance(userData.id)
          if (!compliance.allRequiredConsentsGranted) {
            // Just finished complete-consent — don't bounce straight back while
            // status catches up (stale rows / cache).
            let recentlyCompleted = false
            try {
              const stamp = Number(sessionStorage.getItem('cciq_consents_just_completed') || 0)
              recentlyCompleted = Boolean(stamp && Date.now() - stamp < 30_000)
            } catch {
              /* ignore */
            }
            if (!recentlyCompleted) {
            navigate(
              `/auth/complete-consent?redirect=${encodeURIComponent(`/dashboard${window.location.search}`)}`,
              { replace: true }
            )
            return
            }
          }
        } catch {
          /* allow dashboard if consent API unreachable */
        }
      }
      setUser(userData)
      assessmentsData = listData || []
      setAssessments(assessmentsData)

      // If no assessments but we have a pending one (e.g. from OAuth flow or post-submit redirect), try to associate
      if (assessmentsData.length === 0) {
        if (pendingId) {
          try {
            await associateAssessments([pendingId])
            localStorage.removeItem('pending_assessment_id')
            const reloadAssessments = await listAssessments()
            assessmentsData = reloadAssessments || []
            setAssessments(assessmentsData)
            updateCachedPlaintiffAssessments(assessmentsData)
          } catch (err) {
            console.error('Failed to associate pending assessment:', err)
          }
        }
      }

      // If user has multiple cases and URL has ?case=xyz, load that case; otherwise load latest
      const targetId = caseIdFromUrl && assessmentsData.some((a) => a.id === caseIdFromUrl)
        ? caseIdFromUrl
        : assessmentsData?.[0]?.id
      if (targetId) {
        const [detail, files, requestData, signedData] = await Promise.all([
          getAssessment(targetId),
          getEvidenceFiles(targetId).catch(() => []),
          getPlaintiffDocumentRequests(targetId).catch(() => ({ assessmentId: targetId, evidenceCount: 0, requests: [] as PlaintiffDocumentRequest[] })),
          getPlaintiffSignedDocuments(targetId).catch(() => ({ assessmentId: targetId, leadId: null, documents: [] as PlaintiffSignedDocument[] })),
        ])
        setActiveAssessment(detail)
        const fileList = Array.isArray(files) ? files : []
        setEvidenceCount(fileList.length)
        setEvidenceFiles(fileList)
        setDocumentRequests(Array.isArray(requestData.requests) ? requestData.requests : [])
        setSignedDocuments(Array.isArray(signedData.documents) ? signedData.documents : [])
      } else {
        setDocumentRequests([])
        setSignedDocuments([])
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        navigate(getLoginRedirect('/dashboard', 'plaintiff'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const parsedFacts = (() => {
    if (typeof activeAssessment?.facts === 'string') {
      try {
        return JSON.parse(activeAssessment.facts)
      } catch {
        return {}
      }
    }
    return activeAssessment?.facts || {}
  })()

  const venueState = activeAssessment?.venue?.state || activeAssessment?.venueState || 'California'
  const injuries = Array.isArray(parsedFacts.injuries) ? parsedFacts.injuries : []

  // Injuries are stored as structured objects (e.g. { description, bodyParts:
  // [{ part, severity }], otherDescription }). Rendering them directly produced
  // "[object Object]" in the Case Summary (#19), so flatten them into readable
  // labels. Plain strings (older/simpler records) pass through unchanged.
  const humanizeInjury = (value: string) =>
    value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  const injuryTokens: string[] = (() => {
    const tokens: string[] = []
    for (const inj of injuries) {
      if (!inj) continue
      if (typeof inj === 'string') { tokens.push(inj); continue }
      if (typeof inj !== 'object') { tokens.push(String(inj)); continue }
      const bodyParts = Array.isArray((inj as any).bodyParts) ? (inj as any).bodyParts : []
      for (const bp of bodyParts) {
        const name = typeof bp === 'string' ? bp : bp?.part
        if (name) tokens.push(humanizeInjury(String(name)))
      }
      if ((inj as any).otherDescription) tokens.push(String((inj as any).otherDescription))
      if (tokens.length === 0 || bodyParts.length === 0) {
        const fallback = (inj as any).description || (inj as any).name || (inj as any).type
        if (fallback && !bodyParts.length) tokens.push(humanizeInjury(String(fallback)))
      }
    }
    return tokens.filter(Boolean)
  })()
  const treatment = Array.isArray(parsedFacts.treatment) ? parsedFacts.treatment : []
  const dashboardTreatment = medicalSummary.length > 0 ? medicalSummary : treatment
  const damages = parsedFacts.damages || {}
  const hasNarrative = !!parsedFacts.incident?.narrative
  const hasLocation = !!(parsedFacts.incident?.location || parsedFacts.venue?.state)
  const hasWageLossEvidence = evidenceFiles.some(f => f.category === 'wage_loss')
  const hasWageLoss = !!(damages.wage_loss || parsedFacts?.caseAcceleration?.wageLoss || hasWageLossEvidence)
  const submittedForReview = !!activeAssessment?.submittedForReview
  // Zero means zero. This used to fall back to 3, so a case nobody had picked up
  // still announced "3 attorneys are reviewing your case" — the one number a
  // waiting claimant reads most closely, and the one most likely to be wrong.
  const attorneyReviewCount = routingStatus?.attorneysReviewing && routingStatus.attorneysReviewing > 0
    ? routingStatus.attorneysReviewing
    : 0

  const hasInjuryPhotos = evidenceFiles.some((f: any) => f?.category === 'photos')
  const hasMedicalRecords = evidenceFiles.some((f: any) => f?.category === 'medical_records' || f?.category === 'bills')
  const hasHospitalBill = evidenceFiles.some((f: any) => f?.category === 'bills' || f?.subcategory === 'medical_bill')
  const hasPoliceReport = evidenceFiles.some((f: any) => f?.category === 'police_report')
  const evidenceChecklist = [
    { label: 'Medical records', done: hasMedicalRecords },
    { label: 'Injury photos', done: hasInjuryPhotos },
    { label: 'Police report', done: hasPoliceReport },
    { label: 'Wage loss documentation', done: hasWageLoss }
  ]
  const evidenceScorePercent = Math.round((evidenceChecklist.filter(c => c.done).length / evidenceChecklist.length) * 100)
  const checklist = [
    { label: t('plaintiffDashboard.dynamic.checklist.describeAccident'), done: hasNarrative },
    { label: t('plaintiffDashboard.dynamic.checklist.provideLocation'), done: hasLocation },
    { label: t('plaintiffDashboard.dynamic.checklist.uploadInjuryPhotos'), done: hasInjuryPhotos },
    { label: t('plaintiffDashboard.dynamic.checklist.uploadMedicalRecords'), done: hasMedicalRecords },
    { label: t('plaintiffDashboard.dynamic.checklist.documentWageLoss'), done: hasWageLoss }
  ]
  const docPercent = Math.round((checklist.filter(c => c.done).length / checklist.length) * 100)
  const evidencePercent = evidenceScorePercent

  const viability = activeAssessment?.latest_prediction?.viability
  const valueBands = activeAssessment?.latest_prediction?.value_bands
  // A case with no prediction behind it has no score. Defaulting to 0.5 showed a
  // confident 50% for cases that were never analysed.
  const overallViability = typeof viability?.overall === 'number' ? viability.overall : null
  const liabilityViability = typeof viability?.liability === 'number' ? viability.liability : null
  // A consumer reading "82" reads it as an 82% chance of winning, whatever heading sits
  // above it. Readiness reports how complete the case file is instead — the checklist
  // above accounts for all of it — and is shown as a band so there is no number to
  // mistake for a probability.
  const caseReadinessComplete = checklist.filter((c) => c.done).length
  const caseReadinessTotal = checklist.length
  const caseReadinessLabel = docPercent >= 80 ? 'High' : docPercent >= 50 ? 'Moderate' : 'Building'
  const settlementLow = valueBands?.p25 ?? 15000
  const settlementHigh = valueBands?.p75 ?? 75000
  const settlementMedian = valueBands?.median ?? Math.round((settlementLow + settlementHigh) / 2)

  const liabilityLabel = liabilityViability == null
    ? 'Not assessed'
    : liabilityViability >= 0.7 ? 'Strong' : liabilityViability >= 0.4 ? 'Moderate' : 'Weak'
  const injuryLabel = injuries.length > 0 ? 'Strong' : 'Missing'
  const docLabel = evidenceCount > 0 ? 'Improving' : 'Missing'
  const damagesLabel = damages.med_charges || damages.med_paid || damages.wage_loss ? 'Documented' : 'Not documented'
  // The *Label values above stay as stable English enums because other logic and
  // child components compare against them (e.g. `liabilityLabel === 'Strong'`).
  // bandLabel translates them only at render time so the UI follows the language.
  const bandLabelKeys: Record<string, string> = {
    'High': 'plaintiffDashboard.dynamic.band.high',
    'Moderate': 'plaintiffDashboard.dynamic.band.moderate',
    'Building': 'plaintiffDashboard.dynamic.band.building',
    'Not assessed': 'plaintiffDashboard.dynamic.band.notAssessed',
    'Strong': 'plaintiffDashboard.dynamic.band.strong',
    'Weak': 'plaintiffDashboard.dynamic.band.weak',
    'Missing': 'plaintiffDashboard.dynamic.band.missing',
    'Improving': 'plaintiffDashboard.dynamic.band.improving',
    'Documented': 'plaintiffDashboard.dynamic.band.documented',
    'Not documented': 'plaintiffDashboard.dynamic.band.notDocumented',
  }
  const bandLabel = (value: string | null | undefined): string =>
    value && bandLabelKeys[value] ? t(bandLabelKeys[value]) : (value ?? '')

  const attorneyMatched = !!routingStatus?.attorneyMatched
  const routingLifecycle = routingStatus?.lifecycleState || (attorneyMatched ? 'attorney_matched' : submittedForReview ? 'attorney_review' : 'draft')
  // Only a live SCHEDULED/CONFIRMED appointment counts. After cancel the lead
  // lifecycle is reverted, but even if it briefly lags we must not keep the
  // pipeline / CTAs stuck on "Consultation Scheduled".
  const hasUpcomingConsult = !!routingStatus?.upcomingAppointment
  const caseRetained = isPlaintiffRetained({
    lifecycleState: routingLifecycle,
    leadStatus: routingStatus?.leadStatus,
    caseStage: routingStatus?.caseStage,
  })
  const searchExpanded = (routingStatus?.attorneyActivity || []).some((activity: { type: string }) =>
    activity.type === 'plaintiff_rank_batch_generated'
  )
  const needsMoreInfo = routingLifecycle === 'plaintiff_info_requested' || routingLifecycle === 'needs_more_info'
  const inManualReview = routingLifecycle === 'manual_review_needed'
  const notRoutableYet = routingLifecycle === 'not_routable_yet'
  const plaintiffCaseStatusKey = getPlaintiffCaseStatusKey({
    lifecycleState: routingLifecycle,
    leadStatus: routingStatus?.leadStatus,
    caseStage: routingStatus?.caseStage,
    attorneyMatched: routingStatus?.attorneyMatched,
    upcomingAppointment: routingStatus?.upcomingAppointment,
    reviewingCount: routingStatus?.attorneysReviewing,
    submittedForReview,
  })
  const litigationLabelKey = litigationStatusLabelKey(routingStatus?.litigationStatus)
  // `submittedForReview` is persisted at submission and never cleared once an
  // attorney accepts, so on its own it kept the "N attorneys reviewing your case"
  // banner up — and suppressed the matched banner — even after acceptance
  // (CP-595). Only treat the case as actively in review while no attorney has
  // engaged (accepted, lifecycle advanced, or a consult scheduled).
  const attorneyEngaged =
    attorneyMatched ||
    hasUpcomingConsult ||
    caseRetained ||
    ['attorney_matched', 'engaged', 'consultation_scheduled', 'retained', 'contacted'].includes(routingLifecycle)
  const showReviewBanner = submittedForReview && !attorneyEngaged
  const plaintiffRoutingStatusMessage = plaintiffStatusMessage(routingStatus?.statusMessage)
  // Once matched, the attorney card + consult/docs CTAs carry the story —
  // a second "Consultation Scheduled / upload docs" hero banner is redundant.
  const waitingBanner = attorneyMatched
    ? null
    : inManualReview
    ? {
        title: t('plaintiffDashboard.dynamic.banner.reviewTitle'),
        subtitle: plaintiffRoutingStatusMessage || t('plaintiffDashboard.dynamic.banner.reviewSubtitle'),
        className: 'bg-amber-500 text-white',
        subClassName: 'text-amber-50'
      }
    : needsMoreInfo
    ? {
        title: t('plaintiffDashboard.dynamic.banner.moreInfoTitle'),
        subtitle: plaintiffRoutingStatusMessage || t('plaintiffDashboard.dynamic.banner.moreInfoSubtitle'),
        className: 'bg-blue-600 text-white',
        subClassName: 'text-blue-100'
      }
    : notRoutableYet
    ? {
        title: t('plaintiffDashboard.dynamic.banner.needsDetailTitle'),
        subtitle: plaintiffRoutingStatusMessage || t('plaintiffDashboard.dynamic.banner.needsDetailSubtitle'),
        className: 'bg-slate-700 text-white',
        subClassName: 'text-slate-100'
      }
    : submittedForReview
    ? {
        title: t('plaintiffDashboard.dynamic.banner.submittedTitle'),
        subtitle: plaintiffRoutingStatusMessage || t('plaintiffDashboard.dynamic.banner.submittedSubtitle', { label: responseDeadlineLabel }),
        className: 'bg-brand-600 text-white',
        subClassName: 'text-brand-100'
      }
    : null
  const pendingDocumentRequests = documentRequests.filter((request) => request.status !== 'completed')
  const nextDocumentRequest = pendingDocumentRequests[0] || null
  // One document urgency surface: Action Center when attorney requests exist.
  const showDocActionCenter = pendingDocumentRequests.length > 0
  // Consult card: details when booked; schedule CTA only pre-retain.
  const showConsultCard = hasUpcomingConsult || (attorneyMatched && !caseRetained)
  // Pre-consult checklist only while a consult is still ahead (not after retain).
  const showPreConsultChecklist = hasUpcomingConsult && !caseRetained
  // Next Best Action fills the gap after retain, which is the one stretch of the
  // case with no other guidance: the consult card is gone, and Tasks is empty
  // whenever the attorney has not asked for anything. Before retain it stays
  // hidden because the consult card already carries the schedule CTA and the
  // Action Center carries document requests.
  //
  // The flag previously required `!hasUpcomingConsult` while the markup required
  // `hasUpcomingConsult`, so the two conditions were mutually exclusive and the
  // card never rendered at all.
  const showNextBestAction = attorneyMatched && caseRetained && !showDocActionCenter && !hasUpcomingConsult
  // The supporting line says what the step accomplishes. It used to carry invented
  // dollar figures — "+$2,000 – $5,000" for typing an accident description, "+$1,000 –
  // $3,000" for a location — which are quantified promises about a legal outcome and
  // were not computed from anything. What these steps actually do is make the file
  // complete enough to evaluate, so that is what they say.
  // Scheduling a consultation is only the next step until the attorney is
  // retained; after that this has to fall through to the steps that actually
  // move a live case forward.
  const dailyAction = attorneyMatched && !hasUpcomingConsult && !caseRetained
    ? { action: t('plaintiffDashboard.dynamic.action.scheduleConsult'), detail: t('plaintiffDashboard.dynamic.action.scheduleConsultDetail'), cta: t('plaintiffDashboard.dynamic.action.scheduleConsultCta'), href: '#schedule', isSchedule: true }
    : nextDocumentRequest
    ? {
        action: t('plaintiffDashboard.dynamic.action.uploadRequested'),
        detail: t(
          (nextDocumentRequest.remainingDocs.length || nextDocumentRequest.items.length || 1) === 1
            ? 'plaintiffDashboard.dynamic.action.itemsMissingOne'
            : 'plaintiffDashboard.dynamic.action.itemsMissingMany',
          { count: nextDocumentRequest.remainingDocs.length || nextDocumentRequest.items.length || 1 }
        ),
        cta: t('plaintiffDashboard.dynamic.action.uploadDocumentsCta'),
        href: activeAssessment
          ? evidenceUploadHref(activeAssessment.id, {
              from: 'dashboard',
              returnTo: plaintiffDashboardReturnTo(activeAssessment.id, 'tasks'),
              focus: evidenceTargetForRequestKey(
                nextDocumentRequest.remainingDocs[0] ||
                  nextDocumentRequest.items.find((item) => !item.fulfilled)?.key ||
                  '',
              )?.focus,
              requestId: nextDocumentRequest.id,
            })
          : START_ASSESSMENT_HREF,
        isSchedule: false
      }
    : attorneyMatched && hasUpcomingConsult
    ? { action: t('plaintiffDashboard.dynamic.action.consultScheduled'), detail: t('plaintiffDashboard.dynamic.action.consultScheduledDetail'), cta: t('plaintiffDashboard.dynamic.action.viewDetailsCta'), href: '#consultation', isSchedule: false }
    : inManualReview
    ? { action: t('plaintiffDashboard.dynamic.action.teamReviewing'), detail: t('plaintiffDashboard.dynamic.action.teamReviewingDetail'), cta: t('plaintiffDashboard.dynamic.action.uploadEvidenceCta'), href: activeAssessment ? evidenceUploadHref(activeAssessment.id, { from: 'dashboard' }) : START_ASSESSMENT_HREF, isSchedule: false }
    : needsMoreInfo
    ? { action: t('plaintiffDashboard.dynamic.action.addRequested'), detail: t('plaintiffDashboard.dynamic.action.addRequestedDetail'), cta: t('plaintiffDashboard.dynamic.action.uploadEvidenceCta'), href: activeAssessment ? evidenceUploadHref(activeAssessment.id, { from: 'dashboard' }) : START_ASSESSMENT_HREF, isSchedule: false }
    : notRoutableYet
    ? { action: t('plaintiffDashboard.dynamic.action.strengthenDetails'), detail: t('plaintiffDashboard.dynamic.action.strengthenDetailsDetail'), cta: t('plaintiffDashboard.dynamic.action.improveCaseCta'), href: activeAssessment ? evidenceUploadHref(activeAssessment.id, { from: 'dashboard' }) : START_ASSESSMENT_HREF, isSchedule: false }
    : !hasNarrative
    ? { action: t('plaintiffDashboard.dynamic.action.completeDescription'), detail: t('plaintiffDashboard.dynamic.action.completeDescriptionDetail'), cta: t('plaintiffDashboard.dynamic.action.editCaseCta'), href: `/edit-assessment/${activeAssessment?.id}`, isSchedule: false }
    : !hasLocation
    ? { action: t('plaintiffDashboard.dynamic.action.addLocation'), detail: t('plaintiffDashboard.dynamic.action.addLocationDetail'), cta: t('plaintiffDashboard.dynamic.action.editCaseCta'), href: `/edit-assessment/${activeAssessment?.id}`, isSchedule: false }
    : evidenceCount === 0
    ? { action: t('plaintiffDashboard.dynamic.action.uploadBill'), detail: t('plaintiffDashboard.dynamic.action.uploadBillDetail'), cta: t('plaintiffDashboard.dynamic.action.uploadDocumentCta'), href: activeAssessment?.id ? evidenceUploadHref(activeAssessment.id, { from: 'dashboard' }) : START_ASSESSMENT_HREF, isSchedule: false }
    : !hasWageLoss
    ? { action: t('plaintiffDashboard.dynamic.action.documentWageLoss'), detail: t('plaintiffDashboard.dynamic.action.documentWageLossDetail'), cta: t('plaintiffDashboard.dynamic.action.addWageLossCta'), href: activeAssessment ? evidenceUploadHref(activeAssessment.id, { from: 'dashboard' }) : START_ASSESSMENT_HREF, isSchedule: false }
    : submittedForReview
    ? { action: t('plaintiffDashboard.dynamic.action.submitted'), detail: t('plaintiffDashboard.dynamic.action.submittedDetail', { label: responseDeadlineLabel }), cta: t('plaintiffDashboard.dynamic.action.viewReportCta'), href: activeAssessment ? `/results/${activeAssessment.id}?view=report` : START_ASSESSMENT_HREF, isSchedule: false }
    : { action: t('plaintiffDashboard.dynamic.action.submitCase'), detail: t('plaintiffDashboard.dynamic.action.submitCaseDetail'), cta: t('plaintiffDashboard.dynamic.action.sendForReviewCta'), href: activeAssessment ? `/results/${activeAssessment.id}` : START_ASSESSMENT_HREF, isSchedule: false }
  const evidenceImpact = [
    { label: t('plaintiffDashboard.dynamic.evidence.medicalRecords'), done: hasMedicalRecords, impact: '+22%' },
    { label: t('plaintiffDashboard.dynamic.evidence.injuryPhotos'), done: hasInjuryPhotos, impact: '+10%' },
    { label: t('plaintiffDashboard.dynamic.evidence.policeReport'), done: hasPoliceReport, impact: '+8%' },
    { label: t('plaintiffDashboard.dynamic.evidence.wageLossProof'), done: hasWageLoss, impact: '+15%' }
  ]
  const attorneyActivity = routingStatus?.attorneyActivity ?? []
  const latestAttorneyActivity = attorneyActivity[0]
  // Only ever a real timestamp. A submitted case with no routing events used to
  // report "10 minutes ago", which dressed silence up as progress.
  const latestAttorneyActivityTime = latestAttorneyActivity?.timeAgo || t('plaintiffDashboard.dynamic.activity.none')
  const reviewStageLabel = attorneyMatched ? t('plaintiffDashboard.dynamic.stage.matched') : submittedForReview ? t('plaintiffDashboard.dynamic.stage.attorneyReview') : t('plaintiffDashboard.dynamic.stage.assessment')
  const strengthOpportunities = [
    !hasMedicalRecords && { label: t('plaintiffDashboard.dynamic.opportunity.medicalRecords'), impact: t('plaintiffDashboard.dynamic.impact.highest') },
    !hasHospitalBill && { label: t('plaintiffDashboard.dynamic.opportunity.hospitalBill'), impact: t('plaintiffDashboard.dynamic.impact.medium') },
    !hasPoliceReport && { label: t('plaintiffDashboard.dynamic.opportunity.policeReport'), impact: t('plaintiffDashboard.dynamic.impact.medium') },
    !hasWageLoss && { label: t('plaintiffDashboard.dynamic.opportunity.wageLoss'), impact: t('plaintiffDashboard.dynamic.impact.helpful') },
  ].filter(Boolean) as Array<{ label: string; impact: string }>
  const potentialSettlementLow = Math.max(settlementHigh, Math.round(settlementHigh * 1.25 / 1000) * 1000)
  const potentialSettlementHigh = Math.max(potentialSettlementLow + 5000, Math.round(settlementHigh * 1.8 / 1000) * 1000)

  // Use the canonical formatter so the incident type reads identically on web and
  // mobile ("Motor vehicle", not "Auto Accident") — CP-406. Localized for UI language.
  const claimTypeLabel = localizeClaimType(activeAssessment?.claimType)
  // Human-friendly Case ID (e.g. "CCIQ-2608-PRD-584D"), derived from the case's
  // own fields — not the raw database/reference id.
  const caseIdDisplay = activeAssessment
    ? formatCaseId({
        id: activeAssessment.id,
        claimType: activeAssessment.claimType,
        createdAt: assessments.find((a) => a.id === activeAssessment.id)?.created_at,
      })
    : ''
  const incidentDateLabel = (() => {
    const raw = parsedFacts?.incident?.date || parsedFacts?.incidentDate
    if (!raw) return null
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })
  })()
  const treatmentStatusLabel = treatment.length > 0 ? 'Ongoing' : injuries.length > 0 ? 'Documented' : 'Not documented'
  const caseValueIncreaseItems = [
    { label: 'Medical Records', sub: 'Treatment history & visits', impact: 'High', metric: 'Interest', potential: `${formatCurrency(potentialSettlementLow)} - ${formatCurrency(potentialSettlementHigh)}`, done: hasMedicalRecords },
    { label: 'Police Report', sub: 'Liability & incident details', impact: 'High', metric: 'Interest', potential: `${formatCurrency(settlementHigh)} - ${formatCurrency(potentialSettlementLow)}`, done: hasPoliceReport },
    { label: 'Medical Bills', sub: 'Economic damages', impact: 'Medium', metric: 'Confidence', potential: `${formatCurrency(settlementLow)} - ${formatCurrency(settlementHigh)}`, done: hasHospitalBill },
    { label: 'Proof of Lost Wages', sub: 'Income & loss documentation', impact: 'Low', metric: 'Value', potential: `${formatCurrency(settlementLow)} - ${formatCurrency(settlementHigh)}`, done: hasWageLossEvidence },
  ]
  // Hide the bulk "Add documents" CTA once core checklist items are covered (CP-603).
  const needsMoreDocs =
    strengthOpportunities.length > 0 || caseValueIncreaseItems.some((item) => !item.done)

  const caseCoachTips = [
    { tip: t('plaintiffDashboard.dynamic.coach.gapTip'), action: t('plaintiffDashboard.dynamic.coach.gapAction') },
    { tip: t('plaintiffDashboard.dynamic.coach.wageTip'), action: t('plaintiffDashboard.dynamic.coach.wageAction') },
    { tip: t('plaintiffDashboard.dynamic.coach.policeTip'), action: t('plaintiffDashboard.dynamic.coach.policeAction') },
    { tip: t('plaintiffDashboard.dynamic.coach.strongTip'), action: t('plaintiffDashboard.dynamic.coach.strongAction') }
  ]
  const caseCoachDisplay = attorneyMatched && !hasUpcomingConsult
    ? { tip: t('plaintiffDashboard.dynamic.coach.readyTip'), action: t('plaintiffDashboard.dynamic.coach.readyAction') }
    : attorneyMatched && hasUpcomingConsult
    ? { tip: t('plaintiffDashboard.dynamic.coach.prepTip'), action: t('plaintiffDashboard.dynamic.coach.prepAction') }
    : submittedForReview
    // Keep coach copy on the tip/action strings — do not inject the raw routing
    // statusMessage (it used to show "1 attorney(s)…" and duplicated the banner).
    ? { tip: t('plaintiffDashboard.dynamic.coach.reviewTip'), action: t('plaintiffDashboard.dynamic.coach.reviewAction', { label: responseDeadlineLabel }) }
    : inManualReview
    ? { tip: t('plaintiffDashboard.dynamic.coach.teamTip'), action: t('plaintiffDashboard.dynamic.coach.teamAction') }
    : needsMoreInfo
    ? { tip: t('plaintiffDashboard.dynamic.coach.moreInfoTip'), action: t('plaintiffDashboard.dynamic.coach.moreInfoAction') }
    : notRoutableYet
    ? { tip: t('plaintiffDashboard.dynamic.coach.notRoutableTip'), action: t('plaintiffDashboard.dynamic.coach.notRoutableAction') }
    : !hasMedicalRecords ? caseCoachTips[0] : !hasWageLoss ? caseCoachTips[1] : !hasPoliceReport ? caseCoachTips[2] : caseCoachTips[3]

  // Case Coach used to reuse dailyAction, which after submit points at /results
  // ("View Case Report") — landing on Submission Confirmed instead of a coaching
  // next step. Keep this CTA aligned with the tip above.
  const caseCoachEvidenceHref = activeAssessment
    ? evidenceUploadHref(activeAssessment.id, { from: 'dashboard' })
    : START_ASSESSMENT_HREF
  const caseCoachCta = attorneyMatched && !hasUpcomingConsult
    ? { label: t('plaintiffDashboard.dynamic.action.scheduleConsultCta'), href: '#schedule', isSchedule: true as const }
    : attorneyMatched && hasUpcomingConsult
    ? { label: t('plaintiffDashboard.dynamic.action.uploadEvidenceCta'), href: caseCoachEvidenceHref, isSchedule: false as const }
    : submittedForReview || inManualReview || needsMoreInfo || notRoutableYet || !hasMedicalRecords || !hasWageLoss || !hasPoliceReport
    ? { label: t('plaintiffDashboard.dynamic.action.uploadEvidenceCta'), href: caseCoachEvidenceHref, isSchedule: false as const }
    : {
        label: t('plaintiffDashboard.dynamic.action.sendForReviewCta'),
        href: activeAssessment ? `/results/${activeAssessment.id}?review=1` : START_ASSESSMENT_HREF,
        isSchedule: false as const,
      }

  const scoreFactors = [
    { label: t('plaintiffDashboard.dynamic.factor.liabilityLabel'), value: liabilityLabel, explanation: liabilityLabel === 'Strong' ? t('plaintiffDashboard.dynamic.factor.expLiabStrong') : liabilityLabel === 'Moderate' ? t('plaintiffDashboard.dynamic.factor.expLiabModerate') : t('plaintiffDashboard.dynamic.factor.expLiabWeak'), improve: liabilityLabel !== 'Strong' ? t('plaintiffDashboard.dynamic.factor.impLiab') : null },
    { label: t('plaintiffDashboard.dynamic.factor.injuryLabel'), value: injuryLabel, explanation: injuryLabel === 'Strong' ? t('plaintiffDashboard.dynamic.factor.expInjStrong') : t('plaintiffDashboard.dynamic.factor.expInjWeak'), improve: injuryLabel !== 'Strong' ? t('plaintiffDashboard.dynamic.factor.impInj') : null },
    { label: t('plaintiffDashboard.dynamic.factor.docLabel'), value: docLabel, explanation: docLabel === 'Improving' ? t('plaintiffDashboard.dynamic.factor.expDocImproving') : t('plaintiffDashboard.dynamic.factor.expDocMissing'), improve: docLabel === 'Missing' ? t('plaintiffDashboard.dynamic.factor.impDocMissing') : docLabel === 'Improving' ? t('plaintiffDashboard.dynamic.factor.impDocImproving') : null },
    { label: t('plaintiffDashboard.dynamic.factor.damagesLabel'), value: damagesLabel, explanation: damagesLabel === 'Documented' ? t('plaintiffDashboard.dynamic.factor.expDamDocumented') : t('plaintiffDashboard.dynamic.factor.expDamNot'), improve: damagesLabel !== 'Documented' ? t('plaintiffDashboard.dynamic.factor.impDam') : null }
  ]

  const strengths = checklist.filter(c => c.done).map(c => c.label)

  // Single source of truth for "what to do next". The Tasks tab renders exactly
  // this list, and the Tasks tab badge counts exactly these open items, so the
  // number on the tab can never disagree with the list inside it. Combines the
  // submit-for-review step, the top evidence gaps, and score-improvement tips.
  const assessmentIdForTasks = activeAssessment?.id ?? ''
  const scoreImprovementTasks = scoreFactors
    .filter((factor) => factor.improve)
    .map((factor) => ({
      label: factor.label,
      detail: factor.improve || '',
      done: false,
      href: assessmentIdForTasks ? evidenceUploadHref(assessmentIdForTasks, { from: 'dashboard' }) : START_ASSESSMENT_HREF,
    }))
  // Keep completed evidence items in the list (marked done) rather than dropping
  // them. evidenceImpact is a fixed checklist, so a stable denominator means
  // completing an item raises the "done" count and the progress bar instead of
  // shrinking the total (CP-364).
  const evidenceGapTasks = evidenceImpact
    .slice(0, 3)
    .map((item) => ({
      label: item.label,
      detail: item.done
        ? t('plaintiffDashboard.dynamic.task.uploaded')
        : t('plaintiffDashboard.dynamic.task.estimatedImpact', { impact: item.impact }),
      done: item.done,
      href: assessmentIdForTasks ? evidenceUploadHref(assessmentIdForTasks, { from: 'dashboard' }) : START_ASSESSMENT_HREF,
    }))
  const reviewTask = submittedForReview
    ? {
        label: attorneyMatched ? t('plaintiffDashboard.dynamic.task.scheduleLabel') : t('plaintiffDashboard.dynamic.task.waitLabel'),
        detail: attorneyMatched
          ? hasUpcomingConsult
            ? t('plaintiffDashboard.dynamic.task.scheduledDetail')
            : t('plaintiffDashboard.dynamic.task.bookDetail')
          : t('plaintiffDashboard.dynamic.task.waitDetail'),
        done: attorneyMatched && hasUpcomingConsult,
        href: attorneyMatched ? '/messaging' : `/results/${assessmentIdForTasks}`,
      }
    : {
        label: t('plaintiffDashboard.dynamic.task.submitLabel'),
        detail: t('plaintiffDashboard.dynamic.task.submitDetail'),
        done: false,
        href: `/results/${assessmentIdForTasks}?review=1`,
      }
  // Tasks the attorney assigned to the plaintiff come first — these are explicit
  // requests from the legal team, so they take priority over generated tips (#157).
  const looksLikeDocumentAsk = (title: string) => {
    const t0 = title.trim().toLowerCase()
    return (
      t0.startsWith('request from client:') ||
      t0.startsWith('send document request:') ||
      /\b(upload|document|records?|photos?|police report|wage|dec page|prior treatment)\b/.test(t0)
    )
  }
  const attorneyTaskItems = attorneyTasksFailed
    ? [{
        label: t('plaintiffDashboard.dynamic.task.loadFailedLabel'),
        detail: t('plaintiffDashboard.dynamic.task.loadFailedDetail'),
        done: false,
        href: '/messaging',
      }]
    : attorneyTasks
        // Document asks belong under Requested Documents (upload UI) — keep them
        // out of Your next steps so the middle column is not a second docs list.
        .filter((task) => !looksLikeDocumentAsk(task.title || ''))
        .map((task) => ({
          label: task.title,
          detail: task.notes?.trim()
            ? task.notes.trim()
            : task.dueDate
            ? t('plaintiffDashboard.dynamic.task.attorneyDue', { date: new Date(task.dueDate).toLocaleDateString() })
            : t('plaintiffDashboard.dynamic.task.attorneyRequested'),
          done: task.status === 'done',
          href: '/messaging',
        }))
  // After match, upload checklist items live in Requested Documents — not here.
  const checklistTasks = attorneyMatched
    ? []
    : [...evidenceGapTasks, ...scoreImprovementTasks]
  const dashboardTasks = [...attorneyTaskItems, reviewTask, ...checklistTasks].slice(
    0,
    6 + attorneyTaskItems.length,
  )
  const actionItemsCount = dashboardTasks.filter((task) => !task.done).length

  const riskLevel: 'Low' | 'Moderate' | 'High' = docLabel === 'Missing' ? 'Moderate' : evidenceCount === 0 ? 'Moderate' : 'Low'
  const potentialValueIncrease = !hasNarrative
    ? { msg: t('plaintiffDashboard.dynamic.potential.narrative'), show: true }
    : evidenceCount === 0
    ? { msg: t('plaintiffDashboard.dynamic.potential.medical'), show: true }
    : !hasWageLoss
    ? { msg: t('plaintiffDashboard.dynamic.potential.wage'), show: true }
    : { msg: null, show: false }

  const recentActivity = [
    { label: t('plaintiffDashboard.dynamic.recent.caseCreated'), done: true },
    { label: t('plaintiffDashboard.dynamic.recent.incidentCompleted'), done: hasNarrative },
    { label: t('plaintiffDashboard.dynamic.recent.caseReadiness', { label: bandLabel(caseReadinessLabel) }), done: caseReadinessComplete > 0 },
    { label: t('plaintiffDashboard.dynamic.recent.evidenceUploaded'), done: evidenceCount > 0 },
    { label: t('plaintiffDashboard.dynamic.recent.reviewSubmitted'), done: submittedForReview }
  ]

  const wageLossEstimate = (() => {
    const d = parseInt(wageDays, 10)
    const w = parseFloat(String(wageDaily).replace(/[^0-9.]/g, ''))
    if (d > 0 && w > 0) return d * w
    if (typeof damages.wage_loss === 'number' && damages.wage_loss > 0) return damages.wage_loss
    return null
  })()

  const caseValueHistory = (() => {
    // Prefer real prediction snapshots (material value changes + reason labels).
    // Chronological oldest → newest from the API; do not invent intermediate bars.
    if (Array.isArray(activeAssessment?.caseValueHistory) && activeAssessment.caseValueHistory.length > 0) {
      return activeAssessment.caseValueHistory.map((entry, index, entries) => {
        const reasonKey = entry.reasonKey || (index === 0 ? 'initial' : index === entries.length - 1 ? 'current' : 'updated')
        const reasonPath = `plaintiffDashboard.deferred.value.historyReasons.${reasonKey}`
        const shortPath = `plaintiffDashboard.deferred.value.historyShort.${reasonKey}`
        const translated = t(reasonPath)
        const shortTranslated = t(shortPath)
        return {
          label:
            translated !== reasonPath
              ? translated
              : entry.label ||
                (index === entries.length - 1 ? 'Current estimate' : index === 0 ? 'Initial estimate' : 'Updated estimate'),
          shortLabel:
            shortTranslated !== shortPath
              ? shortTranslated
              : entry.shortLabel || (index === entries.length - 1 ? 'Current' : index === 0 ? 'Initial' : 'Updated'),
          value: Number(entry.value ?? entry.bands?.median) || 0,
        }
      })
    }

    // Minimal fallback when no prediction history exists yet.
    const initial = Number(settlementLow) || 0
    const current = Number(settlementHigh) || initial
    if (!current && !initial) return []
    if (!initial || Math.abs(current - initial) < 1) {
      return [{ label: t('plaintiffDashboard.deferred.value.historyReasons.current'), shortLabel: t('plaintiffDashboard.deferred.value.historyShort.current'), value: current || initial }]
    }
    return [
      { label: t('plaintiffDashboard.deferred.value.historyReasons.initial'), shortLabel: t('plaintiffDashboard.deferred.value.historyShort.initial'), value: initial },
      { label: t('plaintiffDashboard.deferred.value.historyReasons.current'), shortLabel: t('plaintiffDashboard.deferred.value.historyShort.current'), value: current },
    ]
  })()
  const maxValue = caseValueHistory.length > 0 ? Math.max(...caseValueHistory.map((e) => e.value)) : 0

  const notification = evidenceCount > 0
    ? 'Your case score increased after evidence upload.'
    : docPercent >= 40
    ? 'A couple more documents and your file will be complete enough for attorneys to evaluate.'
    : null

  const openScheduleModal = () => {
    setScheduleDate(buildUpcomingDateOptions(1)[0]?.value || new Date().toISOString().slice(0, 10))
    setSelectedScheduleSlot('')
    setScheduleError(null)
    setScheduleSuccess(null)
    setScheduleModalOpen(true)
  }

  const persistPainJournal = async (
    updated: { date: string; level: number; note: string; days?: number; dailyWage?: number }[],
  ) => {
    if (!activeAssessment?.id) return
    const key = `pain_journal_${activeAssessment.id}`
    localStorage.setItem(key, JSON.stringify(updated))
    setJournalEntries(updated)

    const wageFromEntries = updated.reduce((max, e) => {
      if (
        typeof e.days === 'number' &&
        e.days > 0 &&
        typeof e.dailyWage === 'number' &&
        e.dailyWage > 0
      ) {
        return Math.max(max, e.days * e.dailyWage)
      }
      return max
    }, 0)
    const nextDamages = { ...(damages || {}) }
    if (wageFromEntries > 0) nextDamages.wage_loss = wageFromEntries

    try {
      await updateAssessment(activeAssessment.id, {
        painJournal: updated,
        ...(wageFromEntries > 0 ? { damages: nextDamages } : {}),
      })
      setActiveAssessment((prev) => {
        if (!prev) return prev
        let facts: Record<string, unknown> = {}
        try {
          facts = typeof prev.facts === 'string' ? JSON.parse(prev.facts || '{}') : (prev.facts || {})
        } catch {
          facts = {}
        }
        const merged = {
          ...facts,
          painJournal: updated,
          ...(wageFromEntries > 0 ? { damages: nextDamages } : {}),
        }
        return {
          ...prev,
          facts: typeof prev.facts === 'string' ? JSON.stringify(merged) : merged,
        }
      })
    } catch {
      setJournalError('Saved on this device, but could not share with your attorney. Try again.')
    }
  }

  const handleSavePainJournal = () => {
    if (!activeAssessment?.id) return
    // A journal entry with no description of the impact isn't useful evidence, so
    // require the note before logging (#195).
    if (!painNote.trim()) {
      setJournalError('Please describe how your injuries affected your day before logging the entry.')
      return
    }
    // Days/daily wage are optional, but only attach them when both are positive
    // numbers so "00" or blank inputs don't create a meaningless $0 wage claim (#196).
    const days = parseInt(wageDays, 10)
    const dailyWage = parseFloat(String(wageDaily).replace(/[^0-9.]/g, ''))
    const hasWage = Number.isFinite(days) && days > 0 && Number.isFinite(dailyWage) && dailyWage > 0
    let updated: { date: string; level: number; note: string; days?: number; dailyWage?: number }[]
    if (editingEntryIndex !== null) {
      updated = journalEntries.map((e, i) =>
        i === editingEntryIndex
          ? { ...e, level: painLevel, note: painNote.trim(), days: hasWage ? days : undefined, dailyWage: hasWage ? dailyWage : undefined }
          : e
      )
      setEditingEntryIndex(null)
    } else {
      const newEntry = {
        date: new Date().toISOString(),
        level: painLevel,
        note: painNote.trim(),
        ...(hasWage ? { days, dailyWage } : {}),
      }
      updated = [...journalEntries, newEntry].slice(-30)
    }
    // Reset the inputs so the next entry starts from a clean state (#197).
    setPainNote('')
    setWageDays('')
    setWageDaily('')
    setJournalError(null)
    setJournalSaved(true)
    setTimeout(() => setJournalSaved(false), 2500)
    void persistPainJournal(updated)
  }

  const handleEditEntry = (index: number) => {
    const entry = journalEntries[index]
    setPainLevel(entry.level)
    setPainNote(entry.note)
    setWageDays(entry.days != null ? String(entry.days) : '')
    setWageDaily(entry.dailyWage != null ? String(entry.dailyWage) : '')
    setJournalError(null)
    setEditingEntryIndex(index)
  }

  const handleDeleteEntry = (index: number) => {
    const updated = journalEntries.filter((_, i) => i !== index)
    void persistPainJournal(updated)
    if (editingEntryIndex === index) {
      setEditingEntryIndex(null)
      setPainNote('')
      setPainLevel(5)
    } else if (editingEntryIndex !== null && editingEntryIndex > index) {
      setEditingEntryIndex(editingEntryIndex - 1)
    }
  }

  const handleCancelEdit = () => {
    setEditingEntryIndex(null)
    setPainNote('')
    setPainLevel(5)
    setWageDays('')
    setWageDaily('')
    setJournalError(null)
  }

  // Days is a whole number; strip non-digits and collapse leading zeros so
  // values like "00" can't be entered (#196). Cap at 3650 (~10 years) so a
  // fat-fingered paste can't produce an absurd figure.
  const handleWageDaysChange = (value: string) => {
    const digits = value.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '')
    if (digits === '') { setWageDays(''); return }
    setWageDays(String(Math.min(3650, Number(digits))))
  }

  // Daily wage is a currency amount; keep digits and a single decimal point and
  // drop leading zeros so "00" / "007" normalise cleanly (#196). Cap the whole
  // portion at 100,000 so the field can't overflow with an unrealistic value.
  const handleWageDailyChange = (value: string) => {
    let cleaned = value.replace(/[^0-9.]/g, '')
    const firstDot = cleaned.indexOf('.')
    if (firstDot !== -1) {
      cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, 2)
    }
    cleaned = cleaned.replace(/^0+(?=\d)/, '')
    const numeric = Number(cleaned)
    if (Number.isFinite(numeric) && numeric > 100000) {
      cleaned = '100000'
    }
    setWageDaily(cleaned)
  }


  const handleScheduleConsultation = async () => {
    if (!routingStatus?.attorneyMatched?.id || !activeAssessment?.id || !user?.id || !selectedScheduleSlot) return
    setScheduleLoading(true)
    try {
      if (routingStatus?.upcomingAppointment?.id) {
        await updateAppointment(routingStatus.upcomingAppointment.id, {
          type: scheduleType,
          scheduledAt: selectedScheduleSlot,
          duration: 30,
        })
        setScheduleSuccess('Consultation rescheduled.')
      } else {
        await createAppointment({
          attorneyId: routingStatus.attorneyMatched.id,
          assessmentId: activeAssessment.id,
          type: scheduleType,
          scheduledAt: selectedScheduleSlot,
          duration: 30
        })
        setScheduleSuccess('Consultation booked.')
      }
      setScheduleModalOpen(false)
      setSelectedScheduleSlot('')
      setScheduleError(null)
      getRoutingStatus(activeAssessment.id).then(setRoutingStatus)
    } catch (err: any) {
      console.error('Schedule failed', err)
      setScheduleError(err?.response?.data?.error || 'Could not schedule. Please try again.')
    } finally {
      setScheduleLoading(false)
    }
  }

  const handleCancelConsultation = async () => {
    if (!routingStatus?.upcomingAppointment?.id || !activeAssessment?.id) return
    const reason = cancelConsultReason.trim()
    if (!reason) {
      setScheduleError(t('plaintiffDashboard.consultation.cancelReasonRequired'))
      return
    }
    try {
      setCancelConsultLoading(true)
      setScheduleError(null)
      await cancelAppointment(routingStatus.upcomingAppointment.id, reason)
      setCancelConsultOpen(false)
      setCancelConsultReason('')
      setScheduleSuccess(t('plaintiffDashboard.consultation.cancelledToast'))
      const data = await getRoutingStatus(activeAssessment.id)
      setRoutingStatus(data)
    } catch (err: any) {
      setScheduleError(err?.response?.data?.error || t('plaintiffDashboard.consultation.cancelFailed'))
    } finally {
      setCancelConsultLoading(false)
    }
  }

  const handleJoinWaitlist = async () => {
    if (!routingStatus?.attorneyMatched?.id || !activeAssessment?.id) return
    try {
      setWaitlistLoading(true)
      await joinAppointmentWaitlist({
        attorneyId: routingStatus.attorneyMatched.id,
        assessmentId: activeAssessment.id,
        appointmentId: routingStatus.upcomingAppointment?.id,
        preferredDate: scheduleDate ? new Date(scheduleDate).toISOString() : undefined,
      })
      setScheduleSuccess('You are on the earlier-slot waitlist.')
      const data = await getRoutingStatus(activeAssessment.id)
      setRoutingStatus(data)
    } catch (err: any) {
      setScheduleError(err?.response?.data?.error || 'Could not join the waitlist.')
    } finally {
      setWaitlistLoading(false)
    }
  }

  const handleUpdatePrepStatus = async (itemId: string, status: 'pending' | 'uploaded' | 'completed' | 'skipped') => {
    if (!routingStatus?.upcomingAppointment?.id || !activeAssessment?.id) return
    try {
      setPrepSaving(true)
      await updateAppointmentPreparation(routingStatus.upcomingAppointment.id, {
        items: [{ id: itemId, status }],
      })
      const data = await getRoutingStatus(activeAssessment.id)
      setRoutingStatus(data)
    } catch (err) {
      console.error('Failed to update prep item', err)
    } finally {
      setPrepSaving(false)
    }
  }

  const handleSavePrepNotes = async () => {
    if (!routingStatus?.upcomingAppointment?.id || !activeAssessment?.id) return
    try {
      setPrepSaving(true)
      await updateAppointmentPreparation(routingStatus.upcomingAppointment.id, {
        preparationNotes: prepNotes,
        checkInStatus: 'completed',
      })
      const data = await getRoutingStatus(activeAssessment.id)
      setRoutingStatus(data)
      setScheduleSuccess('Consultation prep saved.')
    } catch (err) {
      console.error('Failed to save prep notes', err)
    } finally {
      setPrepSaving(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!routingStatus?.attorneyMatched?.id || !activeAssessment?.id) return
    try {
      setReviewSubmitting(true)
      await createAttorneyReview(routingStatus.attorneyMatched.id, {
        attorneyId: routingStatus.attorneyMatched.id,
        // The review is about this case. Without it the server cannot tell a
        // review of a second matter from an edit of the first (CP-480).
        assessmentId: activeAssessment.id,
        rating: reviewRating,
        title: reviewTitle,
        review: reviewText,
      })
      setReviewOpen(false)
      setReviewTitle('')
      setReviewText('')
      setReviewRating(5)
      setScheduleSuccess('Thank you for sharing your review.')
      const data = await getRoutingStatus(activeAssessment.id)
      setRoutingStatus(data)
    } catch (err: any) {
      setScheduleError(err?.response?.data?.error || 'Could not submit your review.')
    } finally {
      setReviewSubmitting(false)
    }
  }

  const handleDownloadReport = async () => {
    try {
    const { downloadDashboardCaseReportPdf } = await import('../lib/reportPdfExports')
    await downloadDashboardCaseReportPdf({
      incidentSummaryComplete: hasNarrative,
      medicalChronologyCount: treatment.length,
      damagesDocumented: hasWageLoss || !!damages.med_charges,
      evidenceCount,
        caseReadinessLabel,
        caseReadinessProgress: `${caseReadinessComplete}/${caseReadinessTotal}`,
      estimatedValueText: `${formatCurrency(settlementLow)} – ${formatCurrency(settlementHigh)}`,
      documentationPercent: docPercent,
      assessmentId: activeAssessment?.id,
    })
    } catch (err) {
      console.error('Failed to generate dashboard case report PDF:', err)
      const detail = err instanceof Error && err.message ? `\n\nDetails: ${err.message}` : ''
      alert(`Sorry, the case report PDF could not be generated right now. Please try again.${detail}`)
    }
  }

  if (isLoading) {
    return <DashboardPageSkeleton />
  }

  if (!user) return null

  return (
    <div className="min-h-screen transition-colors">
      {/* Schedule Consultation Modal */}
      {scheduleModalOpen && routingStatus?.attorneyMatched && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="surface-panel my-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6 shadow-xl sm:p-8">
            <h3 className="section-title text-ui-xl">{t('plaintiffDashboard.consultation.schedule')}</h3>
            <p className="section-copy mb-4">{t('plaintiffDashboard.schedule.bookCall', { name: routingStatus.attorneyMatched.name })}</p>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('plaintiffDashboard.schedule.chooseDay')}</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {buildUpcomingDateOptions().map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setScheduleDate(option.value)}
                      className={`w-full rounded-lg border px-3 py-2.5 text-sm font-medium ${
                        scheduleDate === option.value
                          ? 'border-brand-600 bg-brand-50 text-brand-700'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t('plaintiffDashboard.schedule.type')}</label>
                <select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value as 'phone' | 'video' | 'in_person')}
                  className="select w-full"
                >
                  <option value="phone">{t('plaintiffDashboard.schedule.typePhone')}</option>
                  <option value="video">{t('plaintiffDashboard.schedule.typeVideo')}</option>
                  <option value="in_person">{t('plaintiffDashboard.schedule.typeInPerson')}</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('plaintiffDashboard.schedule.availableSlots')}</label>
                {scheduleSlotsLoading ? (
                  <div className="helpful-empty px-3 py-4">
                    {t('plaintiffDashboard.schedule.loadingTimes')}
                  </div>
                ) : scheduleError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-4 text-sm text-red-700">
                    {scheduleError}
                  </div>
                ) : scheduleSlots.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-4 text-sm text-amber-800 space-y-3">
                    <p>{t('plaintiffDashboard.schedule.noSlots')}</p>
                    <button
                      type="button"
                      onClick={handleJoinWaitlist}
                      disabled={waitlistLoading}
                      className="btn-outline bg-white disabled:opacity-60"
                    >
                      {waitlistLoading ? t('plaintiffDashboard.schedule.joiningWaitlist') : t('plaintiffDashboard.schedule.joinWaitlist')}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {scheduleSlots.map((slot) => (
                      <button
                        key={slot.start}
                        type="button"
                        onClick={() => setSelectedScheduleSlot(slot.start)}
                        className={`w-full rounded-lg border px-3 py-2.5 text-sm font-medium ${
                          selectedScheduleSlot === slot.start
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {new Date(slot.start).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setScheduleModalOpen(false)
                  setScheduleError(null)
                }}
                className="btn-outline flex-1"
              >
                {t('plaintiffDashboard.consultation.cancel')}
              </button>
              <button
                onClick={handleScheduleConsultation}
                disabled={scheduleLoading || !selectedScheduleSlot}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {scheduleLoading ? t('plaintiffDashboard.schedule.saving') : routingStatus?.upcomingAppointment?.id ? t('plaintiffDashboard.schedule.confirmReschedule') : t('plaintiffDashboard.schedule.scheduleCall')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Greeting scrolls away; tabs stick with an opaque shield so page content
          (e.g. blue Case Value cards) cannot peek through while scrolling. */}
      <div className="space-y-3 pt-4">
        {showDocActionCenter && (
          <div className="relative overflow-hidden rounded-xl border border-amber-200/80 bg-[#FFF8EB] shadow-sm">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-orange-500" aria-hidden />
            <div className="flex flex-col gap-4 py-4 pl-6 pr-4 sm:flex-row sm:items-center sm:gap-5 sm:pr-5">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-100/80">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-amber-100">
                    <FileClock className="h-6 w-6 text-orange-500" aria-hidden />
                  </div>
                </div>
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-orange-800">
                      {t('plaintiffDashboard.actionCenter.title')}
                    </p>
                    <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-bold text-white">
                      {pendingDocumentRequests.length}
                    </span>
            </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {nextDocumentRequest
                      ? t('plaintiffDashboard.actionCenter.waitingOn', {
                          name: nextDocumentRequest.attorney?.name || t('plaintiffDashboard.actionCenter.yourAttorney'),
                          docs:
                            nextDocumentRequest.remainingDocs.length > 0
                              ? nextDocumentRequest.remainingDocs.length === 1
                                ? (() => {
                                    const key = nextDocumentRequest.remainingDocs[0]
                                    const item = nextDocumentRequest.items.find((row) => row.key === key)
                                    return localizeDocumentRequestLabel(
                                      key,
                                      t,
                                      item?.label,
                                    ) || t('plaintiffDashboard.actionCenter.aRequestedDocument')
                                  })()
                                : t('plaintiffDashboard.actionCenter.nRequestedDocuments', {
                                    count: nextDocumentRequest.remainingDocs.length,
                                  })
                              : t('plaintiffDashboard.actionCenter.supportingDocuments'),
                        })
                      : t('plaintiffDashboard.actionCenter.subtitle')}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 sm:border-l sm:border-amber-200/80 sm:pl-5">
            <button
                  type="button"
                  onClick={() => selectTab('tasks')}
                  className="inline-flex items-center gap-2 rounded-lg border border-orange-400 bg-transparent px-3.5 py-2 text-sm font-semibold text-orange-600 transition hover:bg-orange-50"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  {t('plaintiffDashboard.actionCenter.viewDetails')}
                </button>
                <button
                  type="button"
                  onClick={() => selectTab('tasks')}
                  aria-label={t('plaintiffDashboard.actionCenter.viewDetails')}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-orange-500 shadow-md ring-1 ring-black/5 transition hover:bg-orange-50"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
            </div>
          </div>
        )}

        <header className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_10px_30px_-16px_rgba(15,23,42,0.16)] transition-colors dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-none sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-ui-2xl font-semibold text-slate-950 dark:text-slate-50">{t('plaintiffDashboard.greeting', { name: user.firstName })}</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {activeAssessment && showReviewBanner ? (
                  <>
                    <span className="block">{t('plaintiffDashboard.status.inReviewLine1')}</span>
                    <span className="block">{t('plaintiffDashboard.status.inReviewLine2')}</span>
                  </>
                ) : activeAssessment ? (
                  `${t('plaintiffDashboard.status.complete', { percent: docPercent })}${actionItemsCount > 0 ? ` ${t('plaintiffDashboard.status.todo', { count: actionItemsCount, items: t(actionItemsCount === 1 ? 'plaintiffDashboard.status.thing' : 'plaintiffDashboard.status.things') })}` : ''}`
                ) : (
                  t('plaintiffDashboard.status.noCase')
                )}
              </p>
              {assessments.length > 1 && activeAssessment && (
                <div className="mt-3 max-w-md">
                  <label
                    htmlFor="plaintiff-case-switcher"
                    className="mb-1 block text-sm font-bold text-slate-800 dark:text-slate-200"
                  >
                    {t('plaintiffDashboard.caseSwitcher.label')}
                  </label>
                  <div className="relative">
                    <select
                      id="plaintiff-case-switcher"
                      value={activeAssessment.id}
                      onChange={(e) => selectCase(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3 pr-10 text-sm font-medium text-slate-900 shadow-sm transition hover:border-brand-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {assessments.map((assessment) => (
                        <option key={assessment.id} value={assessment.id}>
                          {caseOptionLabel(assessment)}
                        </option>
                      ))}
                    </select>
                    <ChevronRight
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 rotate-90 text-slate-400"
                      aria-hidden
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {t('plaintiffDashboard.caseSwitcher.hint', { count: assessments.length })}
                  </p>
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          {activeAssessment && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t('plaintiffDashboard.caseId.label')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!caseIdDisplay) return
                      try {
                        navigator.clipboard?.writeText(caseIdDisplay)
                      } catch {
                        /* clipboard unavailable — the id is still visible to copy manually */
                      }
                      setCaseIdCopied(true)
                      window.setTimeout(() => setCaseIdCopied(false), 1500)
                    }}
                    title={t('plaintiffDashboard.caseId.copy')}
                    className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <span className="max-w-[16rem] truncate">{caseIdDisplay}</span>
                    {caseIdCopied ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
                    ) : (
                      <Copy className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                    )}
                  </button>
                </div>
              )}
              {attorneyMatched && activeAssessment?.id && routingStatus?.attorneyMatched?.id && (
                <Link
                  to="/messaging"
                  state={{ attorneyId: routingStatus.attorneyMatched.id, assessmentId: activeAssessment.id }}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  {t('plaintiffDashboard.attorneyChat.cta')}
                </Link>
              )}
            </div>
          </div>
        </header>

        {activeAssessment && (() => {
          const visibleTabs = TABS.filter((tab) => tab.id !== 'attorney' || !attorneyMatched)
          return (
          <nav className="sticky top-0 z-40 -mx-4 bg-slate-50 px-4 pb-2 pt-2 dark:bg-slate-950 sm:-mx-6 sm:px-6 md:top-20">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_10px_30px_-16px_rgba(15,23,42,0.16)] transition-colors dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-none sm:p-4">
              <div className={`grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 ${visibleTabs.length >= 6 ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
                {visibleTabs.map((tab) => {
                  const badge =
                    tab.id === 'tasks'
                      ? actionItemsCount + pendingDocumentRequests.length
                      : 0
                return (
                <button
                  key={tab.id}
                      type="button"
                      onClick={() => selectTab(tab.id)}
                      className={`inline-flex w-full min-h-[3.25rem] items-center justify-center gap-2.5 rounded-xl border px-4 py-3.5 text-base font-semibold transition-colors sm:min-h-[3.75rem] sm:px-5 sm:text-lg ${
                    activeTab === tab.id
                          ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-900/70 dark:bg-brand-950/40 dark:text-brand-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-800 dark:hover:text-brand-300'
                  }`}
                >
                  {tab.icon}
                      <span className="truncate">{t(tab.labelKey)}</span>
                  {badge > 0 && (
                        <span className="inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">{badge}</span>
                  )}
                </button>
                )
              })}
              </div>
            </div>
            </nav>
          )
        })()}
        </div>

      <div className="py-6">
        {activeAssessment ? (
          <>
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                <CaseProgressPipeline
                  submittedForReview={submittedForReview}
                  attorneyMatched={attorneyMatched}
                  hasScheduledConsult={hasUpcomingConsult}
                  retained={caseRetained}
                  caseStage={routingStatus?.caseStage}
                  lifecycleState={routingLifecycle}
                  statusMessage={plaintiffRoutingStatusMessage}
                  litigationLabel={litigationLabelKey ? t(litigationLabelKey) : null}
                  statusBadge={{
                    label: t(caseStatusLabelKey(plaintiffCaseStatusKey)),
                    className: caseStatusColor(plaintiffCaseStatusKey),
                    showCheck: plaintiffCaseStatusKey === 'completed' || plaintiffCaseStatusKey === 'closed',
                  }}
                />
                {showReviewBanner && (
                  <section className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-brand-100">{t('plaintiffDashboard.reviewBanner.title')}</p>
                        <p className="mt-1 text-2xl font-bold">
                          {attorneyReviewCount === 0
                            ? t('plaintiffDashboard.reviewBanner.reviewingPending')
                            : t(attorneyReviewCount === 1 ? 'plaintiffDashboard.reviewBanner.reviewingOne' : 'plaintiffDashboard.reviewBanner.reviewingMany', { count: attorneyReviewCount })}
                        </p>
                        <p className="mt-1 text-sm text-brand-100">
                          {t('plaintiffDashboard.reviewBanner.responseTime', { label: responseDeadlineLabel })}
                        </p>
                      </div>
                      <Link
                        to={`/results/${activeAssessment.id}?view=report`}
                        className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                      >
                        {t('plaintiffDashboard.viewCaseReport')}
                      </Link>
                      </div>
                    {latestNotification && (
                      <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-brand-50">
                        <Bell className="h-4 w-4 shrink-0" aria-hidden />
                        <span>{latestNotification}</span>
                      </div>
                    )}
                    <p className="mt-4 border-t border-white/15 pt-3 text-xs text-brand-100">
                      <span className="font-semibold text-white">{t('plaintiffDashboard.reviewBanner.noObligationBold')}</span>{' '}
                      {t('plaintiffDashboard.reviewBanner.noObligationText')}
                    </p>
                  </section>
                )}
                {/* Top status banner - changes when attorney accepts */}
                {waitingBanner && !showReviewBanner && (
                  <div className={`${waitingBanner.className} premium-panel px-6 py-5`}>
                    <p className="text-xl font-bold">{waitingBanner.title}</p>
                    <p className={`${waitingBanner.subClassName} text-sm mt-1`}>{waitingBanner.subtitle}</p>
                  </div>
                )}

                {submittedForReview && !attorneyMatched && searchExpanded && (
                  <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-6 py-5">
                    <Users className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                    <div>
                      <p className="text-base font-semibold text-blue-900">{t('plaintiffDashboard.expandedSearch.title')}</p>
                      <p className="mt-1 text-sm text-blue-800">
                        {t('plaintiffDashboard.expandedSearch.body')}
                      </p>
                    </div>
                  </div>
                )}

                {activeAssessment?.id && (
                  <OpposingDocSuggestionCard assessmentId={activeAssessment.id} />
                )}

                {/* Case Value Updated banner - when documents increase estimate */}
                {activeAssessment?.caseValueUpdated && (
                  <div className="flex items-start gap-3 p-5 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-900 text-lg">{t('plaintiffDashboard.caseValueBanner.title')}</p>
                      <p className="text-sm text-emerald-800 mt-1">
                        {activeAssessment.caseValueUpdated.reason === 'document_upload'
                          ? t('plaintiffDashboard.caseValueBanner.reasonDocs')
                          : t('plaintiffDashboard.caseValueBanner.reasonMedical')}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm">
                        <span className="text-emerald-700">
                          {t('plaintiffDashboard.caseValueBanner.previous')} {formatCurrency(activeAssessment.caseValueUpdated.previousValue.p25)} – {formatCurrency(activeAssessment.caseValueUpdated.previousValue.p75)}
                        </span>
                        <span className="font-semibold text-emerald-900">
                          {t('plaintiffDashboard.caseValueBanner.updated')} {formatCurrency(activeAssessment.caseValueUpdated.newValue.p25)} – {formatCurrency(activeAssessment.caseValueUpdated.newValue.p75)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ATTORNEY ACCEPTED LAYOUT — 3 sections: attorney | consult/task | experience */}
                {attorneyMatched ? (
                  <>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch">
                      {/* 1. Attorney Match — Call / Message under name */}
                      <div className="rounded-xl border-2 border-emerald-200 bg-white p-5 shadow-sm">
                        <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
                        <CheckCircle className="h-6 w-6 text-emerald-600" />
                          {t('plaintiffDashboard.attorneyMatch.title')}
                      </h3>
                          <p className="text-xl font-bold text-gray-900">{routingStatus?.attorneyMatched?.name}, Esq.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {routingStatus?.attorneyMatched?.phone && (
                            <a
                              href={`tel:${routingStatus.attorneyMatched.phone}`}
                              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                            >
                              <Phone className="h-4 w-4" />
                              {t('plaintiffDashboard.attorneyMatch.call')}
                            </a>
                          )}
                          <Link
                            to="/messaging"
                            state={{ attorneyId: routingStatus?.attorneyMatched?.id, assessmentId: activeAssessment?.id }}
                            className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
                          >
                            <MessageCircle className="h-4 w-4" />
                            {t('plaintiffDashboard.attorneyMatch.message')}
                          </Link>
                        </div>
                        <p className="mt-3 text-gray-600">{routingStatus?.attorneyMatched?.firmName || t('plaintiffDashboard.attorneyMatch.lawFirm')}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          {routingStatus?.attorneyMatched?.yearsExperience ? t('plaintiffDashboard.attorneyMatch.yearsExperience', { years: routingStatus.attorneyMatched.yearsExperience }) : t('plaintiffDashboard.attorneyMatch.experiencedAttorney')}
                          {venueState ? ` • ${t('plaintiffDashboard.attorneyMatch.licensed', { state: venueState })}` : ''}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                            {(() => {
                              const s = routingStatus?.attorneyMatched?.specialties
                              if (!s) return null
                              try {
                                const arr = typeof s === 'string' ? JSON.parse(s) : s
                                if (Array.isArray(arr)) {
                                const formatted = arr.map((x: string) => localizeClaimType(x)).filter(Boolean)
                                return t('plaintiffDashboard.attorneyMatch.specializesIn', { list: formatted.join(', ') || t('plaintiffDashboard.attorneyMatch.personalInjury') })
                                }
                              } catch {}
                            return t('plaintiffDashboard.attorneyMatch.specializesIn', { list: localizeClaimType(String(s)) })
                            })()}
                          </p>
                        <p className="mt-1 text-sm text-brand-600">
                          {t('plaintiffDashboard.attorneyMatch.responseTime', { hours: routingStatus?.attorneyMatched?.responseTimeHours ?? 24 })}
                        </p>
                        {routingStatus?.attorneyMatched?.email && (
                          <p className="mt-2 text-sm text-gray-600">{routingStatus.attorneyMatched.email}</p>
                        )}
                        {(routingStatus?.reviewEligible || routingStatus?.upcomingAppointment?.reviewEligible) && (
                          <div className="mt-4 border-t border-emerald-100 pt-4">
                            {reviewOpen ? (
                              <div className="space-y-3">
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((value) => (
                                    <button key={value} type="button" onClick={() => setReviewRating(value)}>
                                      <Star className={`h-5 w-5 ${value <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                    </button>
                                  ))}
                        </div>
                                <input
                                  value={reviewTitle}
                                  onChange={(e) => setReviewTitle(e.target.value)}
                                  placeholder={t('plaintiffDashboard.attorneyContact.reviewTitlePlaceholder')}
                                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                />
                                <textarea
                                  value={reviewText}
                                  onChange={(e) => setReviewText(e.target.value)}
                                  placeholder={t('plaintiffDashboard.attorneyContact.reviewTextPlaceholder')}
                                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                  rows={3}
                                />
                                <div className="flex gap-2">
                                  <button onClick={handleSubmitReview} disabled={reviewSubmitting} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
                                    {reviewSubmitting ? t('plaintiffDashboard.attorneyContact.submitting') : t('plaintiffDashboard.attorneyContact.submitReview')}
                                  </button>
                                  <button onClick={() => setReviewOpen(false)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                                    {t('plaintiffDashboard.attorneyContact.close')}
                                  </button>
                                </div>
                              </div>
                            ) : routingStatus?.existingReview ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((value) => (
                                    <Star
                                      key={value}
                                      className={`h-4 w-4 ${value <= (routingStatus.existingReview?.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                    />
                                  ))}
                                  <span className="ml-1 text-xs text-gray-500">{t('plaintiffDashboard.attorneyContact.yourReview')}</span>
                                </div>
                                {routingStatus.existingReview.title ? (
                                  <p className="text-sm font-medium text-gray-800">{routingStatus.existingReview.title}</p>
                                ) : null}
                                <button
                                  onClick={() => {
                                    setReviewRating(routingStatus.existingReview?.rating || 5)
                                    setReviewTitle(routingStatus.existingReview?.title || '')
                                    setReviewText(routingStatus.existingReview?.review || '')
                                    setReviewOpen(true)
                                  }}
                                  className="text-sm font-medium text-brand-600 hover:underline"
                                >
                                  {t('plaintiffDashboard.attorneyContact.editReview')}
                                </button>
                        </div>
                            ) : (
                              <button onClick={() => setReviewOpen(true)} className="text-sm font-medium text-brand-600 hover:underline">
                                {t('plaintiffDashboard.attorneyContact.leaveReview')}
                              </button>
                            )}
                      </div>
                        )}
                    </div>

                      {/* 2. Consultation scheduled — or Schedule Again after cancel / none booked */}
                      {routingStatus?.upcomingAppointment ? (
                        <div className="flex h-full flex-col rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                          <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
                            <Calendar className="h-6 w-6 text-emerald-600" aria-hidden />
                            {t('plaintiffDashboard.consultation.scheduled')}
                          </h3>
                          <p className="text-xl font-bold text-gray-900">
                            {routingStatus.upcomingAppointment.attorney?.name
                              || routingStatus?.attorneyMatched?.name}
                            {(routingStatus.upcomingAppointment.attorney?.name
                              || routingStatus?.attorneyMatched?.name)
                              ? ', Esq.'
                              : ''}
                          </p>
                          <p className="mt-2 text-base font-medium text-gray-800">
                            {new Date(routingStatus?.upcomingAppointment?.scheduledAt || '').toLocaleString(locale, {
                              weekday: 'long',
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </p>
                          <p className="mt-1 text-base font-medium text-gray-700">
                            {(() => {
                              const rawType = routingStatus?.upcomingAppointment?.type || ''
                              const typeKey =
                                rawType === 'phone' ? 'typePhone'
                                  : rawType === 'video' ? 'typeVideo'
                                    : rawType === 'in_person' ? 'typeInPerson'
                                      : null
                              const typeLabel = typeKey
                                ? t(`plaintiffDashboard.schedule.${typeKey}`)
                                : rawType.replace('_', ' ')
                              return t('plaintiffDashboard.consultation.typeConsultation', { type: typeLabel })
                            })()}
                          </p>
                          {scheduleSuccess && (
                            <p className="mt-2 text-xs text-emerald-700">{scheduleSuccess}</p>
                          )}
                          <div className="mt-auto flex flex-wrap gap-2 pt-4">
                            {routingStatus?.attorneyMatched?.phone && (
                              <a
                                href={`tel:${routingStatus.attorneyMatched.phone}`}
                                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                              >
                                {t('plaintiffDashboard.consultation.joinCall')}
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={openScheduleModal}
                              className="inline-flex items-center justify-center rounded-lg border border-emerald-600 bg-white px-3.5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                              {t('plaintiffDashboard.consultation.reschedule')}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCancelConsultOpen(true)
                                setCancelConsultReason('')
                                setScheduleError(null)
                              }}
                              className="inline-flex items-center justify-center rounded-lg border border-red-600 bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700"
                            >
                              {t('plaintiffDashboard.consultation.cancel')}
                            </button>
                          </div>
                          {cancelConsultOpen ? (
                            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                              <p className="text-sm font-semibold text-red-800">
                                {t('plaintiffDashboard.consultation.cancelConfirmTitle')}
                              </p>
                              <p className="mt-0.5 text-xs text-red-700">
                                {t('plaintiffDashboard.consultation.cancelConfirmBody')}
                              </p>
                              <label className="mt-2 block text-xs font-medium text-red-800" htmlFor="cancel-consult-reason">
                                {t('plaintiffDashboard.consultation.cancelReasonLabel')}
                              </label>
                              <textarea
                                id="cancel-consult-reason"
                                value={cancelConsultReason}
                                onChange={(e) => {
                                  setCancelConsultReason(e.target.value)
                                  // Clear the "reason is required" validation as soon as
                                  // the user starts typing, so a valid reason doesn't sit
                                  // behind a stale error (CP: can't cancel — validation
                                  // message keeps showing even with a reason entered).
                                  if (e.target.value.trim()) setScheduleError(null)
                                }}
                                rows={3}
                                maxLength={500}
                                placeholder={t('plaintiffDashboard.consultation.cancelReasonPlaceholder')}
                                className="mt-1 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-300/40"
                              />
                              {scheduleError ? (
                                <p className="mt-2 text-xs font-medium text-red-700">{scheduleError}</p>
                              ) : null}
                              <div className="mt-2.5 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancelConsultOpen(false)
                                    setCancelConsultReason('')
                                    setScheduleError(null)
                                  }}
                                  disabled={cancelConsultLoading}
                                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                >
                                  {t('plaintiffDashboard.consultation.cancelKeep')}
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelConsultation}
                                  disabled={cancelConsultLoading || !cancelConsultReason.trim()}
                                  className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                                >
                                  {cancelConsultLoading
                                    ? t('plaintiffDashboard.consultation.cancelling')
                                    : t('plaintiffDashboard.consultation.cancelConfirm')}
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5">
                          <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
                            <Calendar className="h-6 w-6 text-emerald-600" aria-hidden />
                            {routingStatus?.hadPriorConsultation
                              ? t('plaintiffDashboard.consultation.scheduleAgainTitle')
                              : t('plaintiffDashboard.consultation.schedule')}
                          </h3>
                          <p className="mb-2 text-sm text-gray-600">
                            {routingStatus?.hadPriorConsultation
                              ? t('plaintiffDashboard.consultation.scheduleAgainBody', {
                                  name: routingStatus?.attorneyMatched?.name || t('plaintiffDashboard.actionCenter.yourAttorney'),
                                })
                              : t('plaintiffDashboard.consultation.bookCallWith', {
                                  name: routingStatus?.attorneyMatched?.name || t('plaintiffDashboard.actionCenter.yourAttorney'),
                                })}
                          </p>
                          {scheduleSuccess && (
                            <p className="mb-3 text-sm font-medium text-emerald-700">{scheduleSuccess}</p>
                          )}
                          {scheduleError && (
                            <p className="mb-3 text-sm font-medium text-red-600">{scheduleError}</p>
                          )}
                          <button
                            type="button"
                            onClick={openScheduleModal}
                            className="mt-auto inline-flex w-fit items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700"
                          >
                            <Calendar className="h-4 w-4" aria-hidden />
                            {routingStatus?.hadPriorConsultation
                              ? t('plaintiffDashboard.consultation.scheduleAgainCta')
                              : t('plaintiffDashboard.consultation.scheduleCta')}
                          </button>
                        </div>
                      )}

                      {/* 3. Experience / feedback */}
                      <PlaintiffSatisfactionCard assessmentId={activeAssessment?.id} />
                    </div>

                    {showNextBestAction && (
                      <div className="flex min-h-[180px] flex-col rounded-xl bg-brand-600 p-5">
                        <h2 className="mb-2 text-lg font-bold text-white">{t('plaintiffDashboard.nextAction.title')}</h2>
                        <p className="mb-1 text-lg text-brand-100">{dailyAction.action}</p>
                        <p className="mb-3 text-sm text-brand-200">{dailyAction.detail}</p>
                        {/* The button follows the step rather than always reading
                            "upload evidence", which contradicted steps like
                            editing the case description. */}
                        <Link to={dailyAction.href} className="mt-auto inline-flex w-fit items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-600 hover:bg-brand-50">
                          {dailyAction.cta}
                          </Link>
                      </div>
                    )}

                    {/* Pre-consult checklist only before retain — after retain, Action Center covers docs */}
                    {showPreConsultChecklist && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                        <h3 className="text-sm font-bold text-amber-900 mb-2">{t('plaintiffDashboard.preConsult.title')}</h3>
                        <div className="space-y-2">
                          {(routingStatus?.upcomingAppointment?.preparation?.prepItems || []).map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-100 bg-white px-3 py-2">
                              <div>
                                <p className="text-sm text-amber-900">{item.label}</p>
                                <p className="text-xs text-amber-700 capitalize">{item.isRequired ? t('plaintiffDashboard.preConsult.required') : t('plaintiffDashboard.preConsult.recommended')} • {item.status}</p>
                              </div>
                              <button
                                onClick={() => handleUpdatePrepStatus(item.id, item.status === 'completed' ? 'pending' : 'completed')}
                                disabled={prepSaving}
                                className="text-xs font-medium text-amber-800 hover:underline disabled:opacity-60"
                              >
                                {item.status === 'completed' ? t('plaintiffDashboard.preConsult.markPending') : t('plaintiffDashboard.preConsult.markDone')}
                              </button>
                            </div>
                          ))}
                        </div>
                        <textarea
                          value={prepNotes}
                          onChange={(e) => setPrepNotes(e.target.value)}
                          placeholder={t('plaintiffDashboard.preConsult.notesPlaceholder')}
                          className="mt-3 w-full rounded-lg border border-amber-200 px-3 py-2 text-sm text-gray-700"
                          rows={3}
                        />
                        <div className="mt-3 flex flex-wrap gap-3">
                          <button
                            onClick={handleSavePrepNotes}
                            disabled={prepSaving}
                            className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                          >
                            {prepSaving ? t('plaintiffDashboard.preConsult.saving') : t('plaintiffDashboard.preConsult.save')}
                          </button>
                          {routingStatus?.upcomingAppointment?.preparation?.waitlistStatus && (
                            <span className="self-center text-xs text-amber-800 capitalize">
                              {t('plaintiffDashboard.preConsult.waitlist', { status: routingStatus.upcomingAppointment.preparation.waitlistStatus })}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                  </>
                ) : (
                  <>
                    {/* Header metric cards */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">{t('plaintiffDashboard.metrics.caseReadiness')}</p>
                        <p className="mt-1 text-3xl font-bold text-emerald-600">{bandLabel(caseReadinessLabel)}</p>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${docPercent}%` }} /></div>
                        <p className="mt-1.5 text-xs font-medium text-gray-500">{t('plaintiffDashboard.metrics.caseDetailsComplete', { complete: caseReadinessComplete, total: caseReadinessTotal })}</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">{t('plaintiffDashboard.metrics.estimatedValueRange')}</p>
                        <p className="mt-1 text-xl font-bold text-gray-900 tabular-nums">{formatCurrency(settlementLow)} – {formatCurrency(settlementHigh)}</p>
                        <p className="text-[11px] text-gray-400">{t('plaintiffDashboard.metrics.mostLikely', { value: formatCurrency(settlementMedian) })}</p>
                        <p className="mt-1 text-[11px] leading-4 text-gray-500">{t('plaintiffDashboard.metrics.basedOnInfo')}</p>
                        <div className="relative mt-2 h-1.5 w-full rounded-full bg-gray-200"><div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600" /></div>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">{t('plaintiffDashboard.advancedDetails.evidenceScore')}</p>
                        <p className="mt-1 text-3xl font-bold text-brand-700 tabular-nums">{evidencePercent}<span className="text-sm font-medium text-gray-400">%</span></p>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-brand-600" style={{ width: `${evidencePercent}%` }} /></div>
                        <p className="mt-1.5 text-xs font-medium text-gray-500">{strengthOpportunities.length > 0 ? t('plaintiffDashboard.metrics.itemsCouldRaise', { count: strengthOpportunities.length, items: t(strengthOpportunities.length === 1 ? 'plaintiffDashboard.metrics.item' : 'plaintiffDashboard.metrics.items') }) : t('plaintiffDashboard.metrics.coreDocsUploaded')}</p>
                      </div>
                    </div>

                    {/* Case Summary + Case Coach */}
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <p className="text-sm font-semibold text-gray-900">{t('plaintiffDashboard.caseSummary.title')}</p>
                        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                          <div><dt className="text-gray-400">{t('plaintiffDashboard.caseSummary.typeOfCase')}</dt><dd className="font-semibold text-gray-800">{claimTypeLabel}</dd></div>
                          <div><dt className="text-gray-400">{t('plaintiffDashboard.caseSummary.injuries')}</dt><dd className="font-semibold text-gray-800">{injuryTokens.length > 0 ? injuryTokens.slice(0, 3).join(', ') : t('plaintiffDashboard.caseSummary.notDocumented')}</dd></div>
                          {incidentDateLabel && (<div><dt className="text-gray-400">{t('plaintiffDashboard.caseSummary.incidentDate')}</dt><dd className="font-semibold text-gray-800">{incidentDateLabel}</dd></div>)}
                          <div><dt className="text-gray-400">{t('plaintiffDashboard.caseSummary.treatmentStatus')}</dt><dd className="font-semibold text-gray-800">{treatmentStatusLabel}</dd></div>
                          <div><dt className="text-gray-400">{t('plaintiffDashboard.caseSummary.jurisdiction')}</dt><dd className="font-semibold text-gray-800">{venueState}</dd></div>
                        </dl>
                        <Link to={`/results/${activeAssessment.id}?view=report`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900">{t('plaintiffDashboard.caseSummary.viewFullDetails')} <ChevronRight className="h-3.5 w-3.5" /></Link>
                          </div>
                      <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white"><Activity className="h-5 w-5" aria-hidden /></span>
                          <p className="text-sm font-semibold text-brand-900">{t('plaintiffDashboard.coach.title')} <span className="text-[10px] font-medium text-brand-500">{t('plaintiffDashboard.coach.aiPowered')}</span></p>
                        </div>
                        <p className="mt-3 text-xs font-semibold text-brand-900">{caseCoachDisplay.tip}</p>
                        <p className="mt-1 text-xs text-brand-800">{caseCoachDisplay.action}</p>
                        {caseCoachCta.isSchedule && !hasUpcomingConsult ? (
                          <button
                            type="button"
                            onClick={openScheduleModal}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                          >
                            {caseCoachCta.label}
                          </button>
                        ) : (
                          <Link to={caseCoachCta.href} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700">{caseCoachCta.label}</Link>
                        )}
                      </div>
                              </div>

                    {/* Strengthen your case (documents raise readiness + value) */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><TrendingUp className="h-5 w-5" aria-hidden /></span>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-semibold text-gray-900">{t('plaintiffDashboard.strengthen.title')}</p>
                            <p className="text-xs text-gray-500">{t('plaintiffDashboard.strengthen.subtitle')}</p>
                      </div>
                    </div>
                        {needsMoreDocs && (
                          <Link to={evidenceUploadHref(activeAssessment.id, { from: 'dashboard' })} className="hidden shrink-0 self-center items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 sm:inline-flex"><Upload className="h-4 w-4" aria-hidden />{t('plaintiffDashboard.strengthen.addDocuments')}</Link>
                        )}
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          {caseValueIncreaseItems.map((item) => (
                          <div key={item.label} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2.5">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><FileText className="h-4 w-4" aria-hidden /></span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-gray-800">{item.label}</p>
                                <p className="truncate text-[11px] text-gray-400">{item.sub}</p>
                              </div>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.impact === 'High' ? 'bg-emerald-50 text-emerald-700' : item.impact === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{item.impact}</span>
                              {item.done ? (
                              <span className="shrink-0 text-[11px] font-semibold text-emerald-600">{t('plaintiffDashboard.strengthen.added')}</span>
                              ) : (
                              <Link to={evidenceUploadHref(activeAssessment.id, { from: 'dashboard' })} className="shrink-0 rounded-md border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50">{t('plaintiffDashboard.strengthen.upload')}</Link>
                              )}
                            </div>
                          ))}
                        </div>
                      {needsMoreDocs && (
                        <Link to={evidenceUploadHref(activeAssessment.id, { from: 'dashboard' })} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 sm:hidden"><Upload className="h-4 w-4" aria-hidden />{t('plaintiffDashboard.strengthen.addDocuments')}</Link>
                      )}
                    </div>

                    {/* Bottom CTA */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Star className="h-5 w-5" aria-hidden /></span>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{t('plaintiffDashboard.submitCta.title')}</p>
                            <p className="text-xs text-gray-500">{t('plaintiffDashboard.submitCta.subtitle')}</p>
                          </div>
                        </div>
                        <div className="text-center sm:text-right">
                          <Link to={submittedForReview ? `/results/${activeAssessment.id}?view=report` : `/results/${activeAssessment.id}?review=1`} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-brand-800 sm:w-auto">
                            {submittedForReview ? t('plaintiffDashboard.submitCta.viewReport') : t('plaintiffDashboard.submitCta.sendForReview')}
                            <ChevronRight className="h-4 w-4" aria-hidden />
                          </Link>
                          <p className="mt-1.5 text-[11px] text-gray-400">{t('plaintiffDashboard.submitCta.footnote')}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                        </div>
            )}

            {activeAssessment && activeTab !== 'dashboard' && (
              <Suspense fallback={<DashboardTabPanelSkeleton message={t('plaintiffDashboard.loadingTab', { tab: t(TABS.find((x) => x.id === activeTab)?.labelKey ?? 'plaintiffDashboard.tabs.dashboard') })} />}>
                <PlaintiffDashboardDeferredTabPanel
                  activeTab={activeTab}
                  activeAssessmentId={activeAssessment.id}
                  caseReadinessLabel={caseReadinessLabel}
                  scoreFactors={scoreFactors}
                  caseValueHistory={caseValueHistory}
                  maxValue={maxValue}
                  settlementHigh={settlementHigh}
                  liabilityLabel={liabilityLabel}
                  evidencePercent={evidencePercent}
                  treatment={dashboardTreatment}
                  damagesLabel={damagesLabel}
                  strengths={strengths}
                  riskLevel={riskLevel}
                  venueState={venueState}
                  settlementMedian={settlementMedian}
                  settlementLow={settlementLow}
                  caseCoachDisplay={caseCoachDisplay}
                  potentialValueIncrease={potentialValueIncrease}
                  evidenceCount={evidenceCount}
                  hasWageLoss={hasWageLoss}
                  onDownloadReport={handleDownloadReport}
                  tasks={dashboardTasks}
                  evidenceImpact={evidenceImpact}
                  recentActivity={recentActivity}
                  notification={notification}
                  wageDays={wageDays}
                  onWageDaysChange={handleWageDaysChange}
                  wageDaily={wageDaily}
                  onWageDailyChange={handleWageDailyChange}
                  journalError={journalError}
                  wageLossEstimate={wageLossEstimate}
                  painLevel={painLevel}
                  onPainLevelChange={setPainLevel}
                  painNote={painNote}
                  onPainNoteChange={(value) => { setPainNote(value); if (journalError) setJournalError(null) }}
                  onSavePainJournal={handleSavePainJournal}
                  editingEntryIndex={editingEntryIndex}
                  onCancelEdit={handleCancelEdit}
                  journalSaved={journalSaved}
                  journalEntries={journalEntries}
                  onEditEntry={handleEditEntry}
                  onDeleteEntry={handleDeleteEntry}
                  submittedForReview={submittedForReview}
                  attorneyMatched={attorneyMatched}
                  hasUpcomingConsult={hasUpcomingConsult}
                  routingLifecycle={routingLifecycle}
                  routingStatusMessage={plaintiffRoutingStatusMessage}
                  attorneyReviewCount={attorneyReviewCount}
                  attorneyActivity={routingStatus?.attorneyActivity ?? []}
                  caseMessages={[...(routingStatus?.caseMessages ?? [])].sort(
                    (a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)
                  )}
                  attorneyName={routingStatus?.attorneyMatched?.name}
                  documentRequests={documentRequests}
                  signedDocuments={signedDocuments}
                  evidenceFiles={evidenceFiles}
                  onDocumentRequestsRefresh={() =>
                    activeAssessment?.id ? refreshCaseDocuments(activeAssessment.id) : undefined
                  }
                />
              </Suspense>
            )}
          </>
        ) : (
          <div className="space-y-6">
            {/* Hero — the single primary call to action */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 p-6 text-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.65)] sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent-500/25 blur-3xl" aria-hidden />
              <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-brand-400/20 blur-3xl" aria-hidden />
              <div className="relative max-w-2xl">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-100 ring-1 ring-white/20">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden /> {t('plaintiffDashboard.onboarding.freeBadge')}
                </span>
                <h2 className="mt-4 font-display text-2xl font-semibold leading-tight sm:text-3xl">{t('plaintiffDashboard.onboarding.heroTitle')}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-brand-100 sm:text-base">
                  {t('plaintiffDashboard.onboarding.heroSubtitle')}
                </p>
                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Link to={START_ASSESSMENT_HREF} className="btn-cta w-full sm:w-auto">
                    <FileText className="h-5 w-5" aria-hidden />
                    {t('common.startAssessment')}
                    <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-brand-100">
                    <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" aria-hidden /> {t('plaintiffDashboard.onboarding.seconds')}</span>
                    <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {t('plaintiffDashboard.onboarding.secure')}</span>
                    <span className="inline-flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" aria-hidden /> {t('plaintiffDashboard.onboarding.noObligation')}</span>
            </div>
                </div>
              </div>
            </section>

            {/* What you'll get + Case journey */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="surface-panel p-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"><Sparkles className="h-5 w-5" aria-hidden /></span>
                  <h3 className="font-display text-lg font-semibold text-slate-950 dark:text-slate-50">{t('plaintiffDashboard.onboarding.whatYouGet')}</h3>
                </div>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('plaintiffDashboard.onboarding.reportIncludes')}</p>
                <ul className="mt-4 space-y-2.5">
                  {[
                    { Icon: BarChart3, label: t('plaintiffDashboard.onboarding.getStrengthScore'), tone: 'text-brand-600' },
                    { Icon: TrendingUp, label: t('plaintiffDashboard.onboarding.getEstimatedValue'), tone: 'text-emerald-600' },
                    { Icon: Star, label: t('plaintiffDashboard.onboarding.getProbability'), tone: 'text-amber-500' },
                    { Icon: Clock, label: t('plaintiffDashboard.onboarding.getTimeline'), tone: 'text-violet-600' },
                    { Icon: Users, label: t('plaintiffDashboard.onboarding.getMatching'), tone: 'text-blue-600' },
                  ].map(({ Icon, label, tone }) => (
                    <li key={label} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                      <Icon className={`h-4 w-4 shrink-0 ${tone}`} aria-hidden />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="surface-panel p-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"><Scale className="h-5 w-5" aria-hidden /></span>
                  <h3 className="font-display text-lg font-semibold text-slate-950 dark:text-slate-50">{t('plaintiffDashboard.onboarding.journeyTitle')}</h3>
                </div>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('plaintiffDashboard.onboarding.journeySubtitle')}</p>
                <ol className="mt-4">
                  {[t('plaintiffDashboard.onboarding.stepAccidentDetails'), t('plaintiffDashboard.onboarding.stepInjuryTreatment'), t('plaintiffDashboard.onboarding.stepEvidenceUpload'), t('plaintiffDashboard.onboarding.stepCaseAnalysis'), t('plaintiffDashboard.onboarding.stepAttorneyReview'), t('plaintiffDashboard.onboarding.stepResolution')].map((step, i, arr) => (
                    <li key={step} className="relative flex gap-3 pb-4 last:pb-0">
                      {i < arr.length - 1 && <span className="absolute left-[13px] top-8 h-[calc(100%-1.25rem)] w-px bg-slate-200 dark:bg-slate-700" aria-hidden />}
                      <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white shadow-sm">{i + 1}</span>
                      <span className="pt-1 text-sm font-medium text-slate-700 dark:text-slate-200">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Getting started + Upload + Help */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="surface-panel p-6">
                <h3 className="font-display text-lg font-semibold text-slate-950 dark:text-slate-50">{t('plaintiffDashboard.onboarding.gettingStarted')}</h3>
                <ol className="mt-4 space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"><CheckCircle className="h-4 w-4" aria-hidden /></span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('plaintiffDashboard.onboarding.accountCreated')}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('plaintiffDashboard.onboarding.accountCreatedNote')}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">2</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('plaintiffDashboard.onboarding.completeAssessment')}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('plaintiffDashboard.onboarding.completeAssessmentNote')}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-400 dark:bg-slate-800 dark:text-slate-500">3</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t('plaintiffDashboard.onboarding.getMatched')}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{t('plaintiffDashboard.onboarding.getMatchedNote')}</p>
                    </div>
                  </li>
                </ol>
              </div>

              <div className="surface-panel flex flex-col p-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-950/40 dark:text-accent-300"><Upload className="h-5 w-5" aria-hidden /></span>
                  <h3 className="font-display text-lg font-semibold text-slate-950 dark:text-slate-50">{t('plaintiffDashboard.onboarding.uploadEvidence')}</h3>
                </div>
                <p className="mt-2 flex-1 text-sm text-slate-600 dark:text-slate-300">{t('plaintiffDashboard.onboarding.uploadEvidenceNote')}</p>
                <Link to={START_ASSESSMENT_HREF} className="btn-outline mt-4 inline-flex w-full items-center justify-center gap-2 bg-white text-sm font-semibold">
                  <Upload className="h-4 w-4" aria-hidden /> {t('plaintiffDashboard.onboarding.startAndUpload')}
                </Link>
              </div>

              <div className="surface-panel p-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"><HelpCircle className="h-5 w-5" aria-hidden /></span>
                  <h3 className="font-display text-lg font-semibold text-slate-950 dark:text-slate-50">{t('plaintiffDashboard.onboarding.needHelp')}</h3>
                </div>
                <ul className="mt-3 space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden /> {t('plaintiffDashboard.onboarding.helpTime')}</li>
                  <li className="flex items-start gap-2"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden /> {t('plaintiffDashboard.onboarding.helpSecure')}</li>
                  <li className="flex items-start gap-2"><CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden /> {t('plaintiffDashboard.onboarding.helpNoObligation')}</li>
                </ul>
              </div>
            </div>

            {/* Already submitted? — secondary, de-emphasized */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><FileStack className="h-5 w-5" aria-hidden /></span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">{t('plaintiffDashboard.onboarding.alreadySubmitted')}</h3>
                  <p className="mt-0.5 text-xs text-amber-800/90 dark:text-amber-300/80">{t('plaintiffDashboard.onboarding.alreadySubmittedNote')}</p>
                  <div className="mt-3">
                    <LinkCaseForm onLinked={loadDashboardData} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {attorneyMatched &&
        activeAssessment?.id &&
        routingStatus?.attorneyMatched?.id &&
        createPortal(
          <DraggableFab
            storageKey="cciq.fab.messageAttorney"
            // Sit above the default Need help launcher so they don't stack on first visit.
            defaultCorner={{ right: 20, bottom: 88 }}
            ariaLabel={t('plaintiffDashboard.attorneyChat.fab')}
            zIndex={100}
            onActivate={() => {
              navigate('/messaging', {
                state: {
                  attorneyId: routingStatus.attorneyMatched!.id,
                  assessmentId: activeAssessment.id,
                },
              })
            }}
            className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          >
            <MessageCircle className="h-5 w-5" aria-hidden />
            <span className="hidden sm:inline">{t('plaintiffDashboard.attorneyChat.fab')}</span>
          </DraggableFab>,
          document.body,
        )}
    </div>
  )
}
