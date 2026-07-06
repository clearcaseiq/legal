import { Suspense, lazy, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { listAssessments, getAssessment, getEvidenceFiles, associateAssessments, getRoutingStatus, createAppointment, getAttorneyAvailability, updateAppointment, cancelAppointment, joinAppointmentWaitlist, updateAppointmentPreparation, sendMessage, getOrCreateChatRoom, getPlaintiffConsentCompliance, requestEmailVerification, getPlaintiffDocumentRequests, getPlaintiffCaseTasks, createAttorneyReview, getMedicalChronology, type PlaintiffDocumentRequest, type PlaintiffCaseTask } from '../lib/api'
import { formatCurrency } from '../lib/formatters'
import { formatClaimTypeShort } from '../lib/constants'
import { CheckCircle, Square, Upload, FileText, TrendingUp, MessageCircle, BarChart3, FileStack, Activity, LayoutDashboard, ChevronRight, Bell, HelpCircle, Clock, Users, Calendar, Phone, Send, Star } from 'lucide-react'
import CaseProgressPipeline from '../components/CaseProgressPipeline'
import { getPlaintiffCaseStatusKey, caseStatusLabel, caseStatusColor } from '../lib/caseStatus'
import OpposingDocSuggestionCard from '../components/OpposingDocSuggestionCard'
import PlaintiffSatisfactionCard from '../components/PlaintiffSatisfactionCard'
import { DashboardPageSkeleton, DashboardTabPanelSkeleton } from '../components/PageSkeletons'
import { clearStoredAuth, getLoginRedirect } from '../lib/auth'
import { loadPlaintiffSessionSummary, updateCachedPlaintiffAssessments } from '../hooks/usePlaintiffSessionSummary'

type TabId = 'dashboard' | 'tasks' | 'documents' | 'requested-documents' | 'attorney' | 'value' | 'journal'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  emailVerified?: boolean
  _count: { assessments: number; favoriteAttorneys: number }
  createdAt: string
}

interface Assessment {
  id: string
  claimType: string
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
  caseValueHistory?: Array<{ label: string; value: number; bands: { p25: number; median: number; p75: number }; createdAt: string }>
}

function LinkCaseForm({ onLinked }: { onLinked: () => void }) {
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
      setMessage('Paste your case report link (e.g. .../results/abc123) or case ID.')
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      // A well-formed but non-existent ID associates nothing (updatedCount: 0).
      // Treat that as a failure instead of falsely reporting success (#81).
      const result = await associateAssessments([id])
      if (!result || Number(result.updatedCount) < 1) {
        setMessage('No case found for that link or ID. Double-check it and try again.')
        return
      }
      setMessage('Case linked successfully!')
      setInput('')
      onLinked()
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Could not link case. Make sure the link is correct.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <p className="text-xs font-medium text-gray-700 mb-2">Already submitted a case?</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your case report link"
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 disabled:opacity-50"
        >
          {loading ? 'Linking...' : 'Link Case'}
        </button>
      </form>
      {message && <p className="text-xs mt-2 text-gray-600">{message}</p>}
    </div>
  )
}

function plaintiffStatusMessage(message?: string | null) {
  return (message ?? '')
    .replace(/manual review/gi, 'team review')
    .replace(/human review/gi, 'team review')
}

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'tasks', label: 'Tasks', icon: <CheckCircle className="h-4 w-4" /> },
  { id: 'documents', label: 'Documents', icon: <FileStack className="h-4 w-4" /> },
  { id: 'requested-documents', label: 'Requested Documents', icon: <FileText className="h-4 w-4" /> },
  { id: 'attorney', label: 'Attorney Review', icon: <Users className="h-4 w-4" /> },
  { id: 'value', label: 'Case Value', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'journal', label: 'Journal', icon: <MessageCircle className="h-4 w-4" /> }
]

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
  const [user, setUser] = useState<User | null>(null)
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [activeAssessment, setActiveAssessment] = useState<ActiveAssessment | null>(null)
  const [evidenceCount, setEvidenceCount] = useState(0)
  const [evidenceFiles, setEvidenceFiles] = useState<{ category?: string }[]>([])
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
    caseChatRoomId?: string | null
  } | null>(null)
  const responseDeadlineLabel = routingStatus?.responseDeadlineLabel || '24 hours'
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [caseMessageInput, setCaseMessageInput] = useState('')
  const [caseMessageSending, setCaseMessageSending] = useState(false)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleDate, setScheduleDate] = useState(buildUpcomingDateOptions(1)[0]?.value || '')
  const [scheduleType, setScheduleType] = useState<'phone' | 'video' | 'in_person'>('phone')
  const [scheduleSlots, setScheduleSlots] = useState<Array<{ start: string; end: string; available: boolean }>>([])
  const [scheduleSlotsLoading, setScheduleSlotsLoading] = useState(false)
  const [selectedScheduleSlot, setSelectedScheduleSlot] = useState<string>('')
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null)
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
  const [attorneyTasks, setAttorneyTasks] = useState<PlaintiffCaseTask[]>([])
  const [verifyNotice, setVerifyNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [verifySending, setVerifySending] = useState(false)
  const navigate = useNavigate()

  const handleRequestVerification = async () => {
    setVerifySending(true)
    setVerifyNotice(null)
    try {
      await requestEmailVerification()
      setVerifyNotice({ type: 'success', text: 'Verification link sent. Please check your email (including spam).' })
    } catch {
      setVerifyNotice({ type: 'error', text: 'We couldn’t send the verification email right now. Please try again later or contact support.' })
    } finally {
      setVerifySending(false)
    }
  }
  const [searchParams] = useSearchParams()

  useEffect(() => {
    setPrepNotes(routingStatus?.upcomingAppointment?.preparation?.preparationNotes || '')
  }, [routingStatus?.upcomingAppointment?.id, routingStatus?.upcomingAppointment?.preparation?.preparationNotes])
  const caseIdFromUrl = searchParams.get('case')

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Allow deep-linking to a specific tab via ?tab= (e.g. notification links that
  // jump straight to Requested Documents).
  useEffect(() => {
    const requestedTab = searchParams.get('tab')
    if (requestedTab && TABS.some((tab) => tab.id === requestedTab)) {
      setActiveTab(requestedTab as TabId)
    }
  }, [searchParams])

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
        const [detail, files, requestData] = await Promise.all([
          getAssessment(caseIdFromUrl),
          getEvidenceFiles(caseIdFromUrl).catch(() => []),
          getPlaintiffDocumentRequests(caseIdFromUrl).catch(() => ({ assessmentId: caseIdFromUrl, evidenceCount: 0, requests: [] as PlaintiffDocumentRequest[] })),
        ])
        if (cancelled) return
        setActiveAssessment(detail)
        const fileList = Array.isArray(files) ? files : []
        setEvidenceCount(fileList.length)
        setEvidenceFiles(fileList)
        setDocumentRequests(Array.isArray(requestData.requests) ? requestData.requests : [])
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
        if (!cancelled) setAttorneyTasks(Array.isArray(data?.tasks) ? data.tasks : [])
      })
      .catch(() => {
        if (!cancelled) setAttorneyTasks([])
      })
    return () => { cancelled = true }
  }, [activeAssessment?.id])

  useEffect(() => {
    if (activeAssessment?.id) {
      const key = `pain_journal_${activeAssessment.id}`
      const stored = JSON.parse(localStorage.getItem(key) || '[]')
      setJournalEntries(Array.isArray(stored) ? stored : [])
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
      if (document.visibilityState === 'visible') void refreshActiveAssessment()
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
          if (last?.type === 'viewed') setLatestNotification('An attorney viewed your case.')
          else if (last?.type === 'accepted') setLatestNotification('An attorney is interested in your case!')
          else if (last?.type === 'requested_info') setLatestNotification('An attorney requested more information.')
          else if (last?.type === 'manual_review_needed') setLatestNotification('Your case is in team review.')
          else if (last?.type === 'plaintiff_rank_advanced') setLatestNotification('Your case moved to the next attorney in your ranked list.')
          else if (last?.type === 'plaintiff_rank_batch_generated') setLatestNotification('Your original top choices were unavailable, so we expanded the search to more matching attorneys.')
          else if (data?.statusMessage) setLatestNotification(plaintiffStatusMessage(data.statusMessage))
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
        setScheduleError(error?.response?.data?.error || 'Could not load consultation times.')
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
            navigate(
              `/auth/complete-consent?redirect=${encodeURIComponent(`/dashboard${window.location.search}`)}`,
              { replace: true }
            )
            return
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
        const [detail, files, requestData] = await Promise.all([
          getAssessment(targetId),
          getEvidenceFiles(targetId).catch(() => []),
          getPlaintiffDocumentRequests(targetId).catch(() => ({ assessmentId: targetId, evidenceCount: 0, requests: [] as PlaintiffDocumentRequest[] }))
        ])
        setActiveAssessment(detail)
        const fileList = Array.isArray(files) ? files : []
        setEvidenceCount(fileList.length)
        setEvidenceFiles(fileList)
        setDocumentRequests(Array.isArray(requestData.requests) ? requestData.requests : [])
      } else {
        setDocumentRequests([])
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
  const hasWageLoss = !!(damages.wage_loss || parsedFacts?.caseAcceleration?.wageLoss || evidenceFiles.some(f => f.category === 'wage_loss'))
  const submittedForReview = !!activeAssessment?.submittedForReview
  const attorneyReviewCount = (routingStatus?.attorneysReviewing && routingStatus.attorneysReviewing > 0) ? routingStatus.attorneysReviewing : 3

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
    { label: 'Describe the accident', done: hasNarrative },
    { label: 'Provide location', done: hasLocation },
    { label: 'Upload injury photos', done: hasInjuryPhotos },
    { label: 'Upload medical records', done: hasMedicalRecords },
    { label: 'Document wage loss', done: hasWageLoss }
  ]
  const docPercent = Math.round((checklist.filter(c => c.done).length / checklist.length) * 100)
  const evidencePercent = evidenceScorePercent

  const viability = activeAssessment?.latest_prediction?.viability
  const valueBands = activeAssessment?.latest_prediction?.value_bands
  const caseScore = Math.round((viability?.overall ?? 0.5) * 100)
  const caseScoreLabel = caseScore >= 75 ? 'Strong' : caseScore >= 50 ? 'Moderately Strong' : caseScore >= 25 ? 'Moderate' : 'Needs Work'
  const settlementLow = valueBands?.p25 ?? 15000
  const settlementHigh = valueBands?.p75 ?? 75000
  const settlementMedian = valueBands?.median ?? Math.round((settlementLow + settlementHigh) / 2)

  const liabilityLabel = (viability?.liability ?? 0.5) >= 0.7 ? 'Strong' : (viability?.liability ?? 0.5) >= 0.4 ? 'Moderate' : 'Weak'
  const injuryLabel = injuries.length > 0 ? 'Strong' : 'Missing'
  const docLabel = evidenceCount > 0 ? 'Improving' : 'Missing'
  const damagesLabel = damages.med_charges || damages.med_paid || damages.wage_loss ? 'Documented' : 'Not documented'

  const attorneyMatched = !!routingStatus?.attorneyMatched
  const hasUpcomingConsult = !!routingStatus?.upcomingAppointment
  const routingLifecycle = routingStatus?.lifecycleState || (attorneyMatched ? 'attorney_matched' : submittedForReview ? 'attorney_review' : 'draft')
  const searchExpanded = (routingStatus?.attorneyActivity || []).some((activity: { type: string }) =>
    activity.type === 'plaintiff_rank_batch_generated'
  )
  const needsMoreInfo = routingLifecycle === 'plaintiff_info_requested' || routingLifecycle === 'needs_more_info'
  const inManualReview = routingLifecycle === 'manual_review_needed'
  const notRoutableYet = routingLifecycle === 'not_routable_yet'
  const plaintiffCaseStatusKey = getPlaintiffCaseStatusKey({
    lifecycleState: routingLifecycle,
    attorneyMatched: routingStatus?.attorneyMatched,
    upcomingAppointment: routingStatus?.upcomingAppointment,
    reviewingCount: routingStatus?.attorneysReviewing,
    submittedForReview,
  })
  const waitingState = inManualReview || needsMoreInfo || notRoutableYet
  const plaintiffRoutingStatusMessage = plaintiffStatusMessage(routingStatus?.statusMessage)
  const waitingBanner = attorneyMatched
    ? {
        title: 'Attorney Interested In Your Case',
        subtitle: "You're now working with an attorney. Schedule your consultation to discuss your case.",
        className: 'bg-emerald-600 text-white',
        subClassName: 'text-emerald-100'
      }
    : inManualReview
    ? {
        title: 'Your Case Is In Team Review',
        subtitle: plaintiffRoutingStatusMessage || 'Our team is checking routing fit and the next best step.',
        className: 'bg-amber-500 text-white',
        subClassName: 'text-amber-50'
      }
    : needsMoreInfo
    ? {
        title: 'More Information Needed',
        subtitle: plaintiffRoutingStatusMessage || 'Add the requested details or documents so your case can keep moving.',
        className: 'bg-blue-600 text-white',
        subClassName: 'text-blue-100'
      }
    : notRoutableYet
    ? {
        title: 'Your Case Needs More Detail',
        subtitle: plaintiffRoutingStatusMessage || 'Strengthen your case with more facts or evidence before routing.',
        className: 'bg-slate-700 text-white',
        subClassName: 'text-slate-100'
      }
    : submittedForReview
    ? {
        title: 'Submitted for Attorney Review',
        subtitle: plaintiffRoutingStatusMessage || `Expected response within ${responseDeadlineLabel}`,
        className: 'bg-brand-600 text-white',
        subClassName: 'text-brand-100'
      }
    : null
  const pendingDocumentRequests = documentRequests.filter((request) => request.status !== 'completed')
  const nextDocumentRequest = pendingDocumentRequests[0] || null
  const dailyAction = attorneyMatched && !hasUpcomingConsult
    ? { action: 'Next Step: Schedule Consultation', valueIncrease: 'Book a call with your attorney to discuss your case', cta: 'Schedule Consultation', href: '#schedule', isSchedule: true }
    : nextDocumentRequest
    ? {
        action: 'Upload the documents your attorney requested',
        valueIncrease: `${nextDocumentRequest.remainingDocs.length || nextDocumentRequest.items.length || 1} item${(nextDocumentRequest.remainingDocs.length || nextDocumentRequest.items.length || 1) === 1 ? '' : 's'} still missing`,
        cta: 'Upload Documents',
        href: activeAssessment ? `/evidence-upload/${activeAssessment.id}` : '/assessment/start',
        isSchedule: false
      }
    : attorneyMatched && hasUpcomingConsult
    ? { action: 'Consultation scheduled', valueIncrease: 'Prepare for your call with your attorney', cta: 'View Details', href: '#consultation', isSchedule: false }
    : inManualReview
    ? { action: 'Our team is reviewing your case', valueIncrease: 'You do not need to do anything urgent unless we request more information.', cta: 'Upload Evidence', href: activeAssessment ? `/evidence-upload/${activeAssessment.id}` : '/assessment/start', isSchedule: false }
    : needsMoreInfo
    ? { action: 'Add the requested information', valueIncrease: 'Responding quickly helps attorneys continue reviewing your case', cta: 'Upload Evidence', href: activeAssessment ? `/evidence-upload/${activeAssessment.id}` : '/assessment/start', isSchedule: false }
    : notRoutableYet
    ? { action: 'Strengthen your case details', valueIncrease: 'More evidence and complete facts can make your case routable', cta: 'Improve Case', href: activeAssessment ? `/evidence-upload/${activeAssessment.id}` : '/assessment/start', isSchedule: false }
    : !hasNarrative
    ? { action: 'Complete your accident description', valueIncrease: '+$2,000 – $5,000', cta: 'Edit case', href: `/edit-assessment/${activeAssessment?.id}`, isSchedule: false }
    : !hasLocation
    ? { action: 'Add incident location', valueIncrease: '+$1,000 – $3,000', cta: 'Edit case', href: `/edit-assessment/${activeAssessment?.id}`, isSchedule: false }
    : evidenceCount === 0
    ? { action: 'Upload your urgent care or hospital bill', valueIncrease: '+$3,000 – $8,000', cta: 'Upload Document', href: `/evidence-upload/${activeAssessment?.id}`, isSchedule: false }
    : !hasWageLoss
    ? { action: 'Document wage loss if you missed work', valueIncrease: 'This could increase your case value by $1,000–$5,000', cta: 'Add wage loss', href: activeAssessment ? `/evidence-upload/${activeAssessment.id}` : '/assessment/start', isSchedule: false }
    : submittedForReview
    ? { action: 'Your case has been submitted for attorney review', valueIncrease: `Attorneys typically respond within ${responseDeadlineLabel}`, cta: 'View Case Report', href: activeAssessment ? `/results/${activeAssessment.id}` : '/assessment/start', isSchedule: false }
    : { action: 'Submit your case for attorney review', valueIncrease: 'Get matched with attorneys', cta: 'Send for review', href: activeAssessment ? `/results/${activeAssessment.id}` : '/assessment/start', isSchedule: false }
  const routingTimelineItems = [
    submittedForReview
      ? {
          title: 'Case submitted for attorney review',
          detail: plaintiffRoutingStatusMessage || 'Your case is in the matching queue.',
          tone: 'border-brand-200 bg-brand-50 text-brand-700',
        }
      : null,
    attorneyMatched && routingStatus?.attorneyMatched
      ? {
          title: `${routingStatus.attorneyMatched.name} is interested in your case`,
          detail: hasUpcomingConsult
            ? 'Your consultation is the next milestone.'
            : 'Schedule a consultation to move forward.',
          tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        }
      : null,
    hasUpcomingConsult && routingStatus?.upcomingAppointment
      ? {
          title: 'Consultation scheduled',
          detail: new Date(routingStatus.upcomingAppointment.scheduledAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }),
          tone: 'border-blue-200 bg-blue-50 text-blue-700',
        }
      : null,
    routingStatus?.upcomingAppointment?.preparation?.waitlistStatus
      ? {
          title: 'Earlier-slot waitlist active',
          detail: `Status: ${routingStatus.upcomingAppointment.preparation.waitlistStatus}`,
          tone: 'border-violet-200 bg-violet-50 text-violet-700',
        }
      : null,
    ...((routingStatus?.attorneyActivity || []).slice(0, 4).map((activity) => ({
      title: activity.message,
      detail: activity.timeAgo || 'Recent update',
      tone: 'border-slate-200 bg-slate-50 text-slate-700',
    }))),
  ].filter(Boolean) as Array<{ title: string; detail: string; tone: string }>

  const evidenceImpact = [
    { label: 'Medical Records', done: hasMedicalRecords, impact: '+22%' },
    { label: 'Injury Photos', done: hasInjuryPhotos, impact: '+10%' },
    { label: 'Police Report', done: hasPoliceReport, impact: '+8%' },
    { label: 'Wage Loss Proof', done: hasWageLoss, impact: '+15%' }
  ]
  const attorneyActivity = routingStatus?.attorneyActivity ?? []
  const latestAttorneyActivity = attorneyActivity[0]
  const latestAttorneyActivityTime = latestAttorneyActivity?.timeAgo || (submittedForReview ? '10 minutes ago' : 'No attorney activity yet')
  const reviewStageLabel = attorneyMatched ? 'Matched' : submittedForReview ? 'Attorney Review' : 'Assessment'
  const reviewProgressItems = [
    { label: 'Assessment', done: true, current: false },
    { label: 'Submitted', done: submittedForReview || attorneyMatched, current: !submittedForReview && !attorneyMatched },
    { label: 'Attorney Review', done: attorneyMatched, current: submittedForReview && !attorneyMatched },
    { label: 'Matched', done: attorneyMatched, current: attorneyMatched && !hasUpcomingConsult },
    { label: 'Consultation', done: hasUpcomingConsult, current: hasUpcomingConsult },
  ]
  const caseStrengthFriendly = caseScore >= 70 ? 'Strong' : caseScore >= 45 ? 'Good' : 'Developing'
  const strengthOpportunities = [
    !hasMedicalRecords && { label: 'Upload medical records', impact: 'Highest Impact' },
    !hasHospitalBill && { label: 'Upload hospital bill', impact: 'Medium Impact' },
    !hasPoliceReport && { label: 'Upload police report', impact: 'Medium Impact' },
    !hasWageLoss && { label: 'Upload wage loss documents', impact: 'Helpful' },
  ].filter(Boolean) as Array<{ label: string; impact: string }>
  const hasErTreatment = Array.isArray(treatment) && treatment.some((item: any) =>
    String(item?.type || item?.providerType || item || '').toLowerCase().includes('er') ||
    String(item?.type || item?.providerType || item || '').toLowerCase().includes('emergency')
  )
  const potentialSettlementLow = Math.max(settlementHigh, Math.round(settlementHigh * 1.25 / 1000) * 1000)
  const potentialSettlementHigh = Math.max(potentialSettlementLow + 5000, Math.round(settlementHigh * 1.8 / 1000) * 1000)
  const similarCaseFactors = [
    hasErTreatment && 'ER Treatment',
    hasMedicalRecords && 'Medical Records',
    hasHospitalBill && 'Hospital Bill',
    hasPoliceReport && 'Police Report',
    liabilityLabel === 'Strong' && 'Clear Responsibility',
  ].filter(Boolean).slice(0, 3) as string[]
  const commonSimilarFactors = similarCaseFactors.length > 0 ? similarCaseFactors : ['ER Treatment', 'MRI', 'Rear-End Collision']

  // --- Derived values for the redesigned dashboard ---
  const attorneyInterest = Math.max(0, Math.min(99, Math.round(((viability?.overall ?? 0.5) * 0.6 + (viability?.liability ?? 0.5) * 0.4) * 100)))
  const attorneyInterestLabel = attorneyInterest >= 70 ? 'High' : attorneyInterest >= 45 ? 'Moderate' : 'Building'
  const settlementLikelihood = Math.max(40, Math.min(97, caseScore + 10))
  const liabilityPercent = Math.round((viability?.liability ?? 0.5) * 100)
  const liabilityHelps = [
    hasMedicalRecords && 'Medical treatment documented',
    liabilityLabel === 'Strong' && 'Clear liability',
    hasPoliceReport && 'Police report on file',
    hasInjuryPhotos && 'Injury photos provided',
  ].filter(Boolean).slice(0, 3) as string[]
  const liabilityHurts = [
    !hasPoliceReport && 'Police report not uploaded',
    !hasMedicalRecords && 'Medical records missing',
    !hasWageLoss && 'No wage-loss documentation',
  ].filter(Boolean).slice(0, 3) as string[]
  const previewAttorneyMatches = [
    { firm: 'Auto Injury Law Group', focus: 'Auto Accidents • Personal Injury', score: 94, rating: 4.9, reviews: 128 },
    { firm: 'Wilshire Law Firm', focus: 'Injury • Insurance Disputes', score: 91, rating: 4.8, reviews: 96 },
    { firm: 'Panish | Shea | Ravipudi LLP', focus: 'Serious Injury • Wrongful Death', score: 88, rating: 4.8, reviews: 75 },
  ]
  const claimTypeLabel = activeAssessment?.claimType === 'auto'
    ? 'Auto Accident'
    : activeAssessment?.claimType === 'slip_and_fall'
      ? 'Slip and Fall'
      : activeAssessment?.claimType === 'medmal'
        ? 'Medical Malpractice'
        : 'Personal Injury'
  const incidentDateLabel = (() => {
    const raw = parsedFacts?.incident?.date || parsedFacts?.incidentDate
    if (!raw) return null
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  })()
  const treatmentStatusLabel = treatment.length > 0 ? 'Ongoing' : injuries.length > 0 ? 'Documented' : 'Not documented'
  const reviewStatusSteps = [
    { label: 'Assessment Complete', sub: 'You provided details about your case.', done: true, current: false },
    { label: 'Submitted', sub: 'Your case has been sent for review.', done: submittedForReview, current: !submittedForReview },
    { label: 'Attorney Review', sub: 'Attorneys are evaluating your case.', done: false, current: submittedForReview },
    { label: 'Consultation', sub: 'Interested attorneys may contact you.', done: false, current: false },
    { label: 'Representation', sub: 'You decide if you want to hire.', done: false, current: false },
  ]
  const caseValueIncreaseItems = [
    { label: 'Medical Records', sub: 'Treatment history & visits', impact: 'High', metric: 'Interest', potential: `${formatCurrency(potentialSettlementLow)} - ${formatCurrency(potentialSettlementHigh)}`, done: hasMedicalRecords },
    { label: 'Police Report', sub: 'Liability & incident details', impact: 'High', metric: 'Interest', potential: `${formatCurrency(settlementHigh)} - ${formatCurrency(potentialSettlementLow)}`, done: hasPoliceReport },
    { label: 'Medical Bills', sub: 'Economic damages', impact: 'Medium', metric: 'Confidence', potential: `${formatCurrency(settlementLow)} - ${formatCurrency(settlementHigh)}`, done: hasHospitalBill },
    { label: 'Proof of Lost Wages', sub: 'Income & loss documentation', impact: 'Low', metric: 'Value', potential: `${formatCurrency(settlementLow)} - ${formatCurrency(settlementHigh)}`, done: hasWageLoss },
  ]

  const caseCoachTips = [
    { tip: 'Insurance companies often challenge treatment gaps.', action: 'Uploading medical records strengthens your case and reduces disputes.' },
    { tip: 'Documenting lost wages can add thousands to your settlement.', action: 'Add pay stubs or employer verification to strengthen this factor.' },
    { tip: 'Police reports establish liability.', action: 'If you have one, upload it to support your claim.' },
    { tip: 'Your case looks strong.', action: 'Submitting for attorney review is the next step.' }
  ]
  const caseCoachDisplay = attorneyMatched && !hasUpcomingConsult
    ? { tip: 'Your attorney is ready to discuss your case.', action: 'Schedule your consultation to get started.' }
    : attorneyMatched && hasUpcomingConsult
    ? { tip: 'Prepare for your consultation.', action: 'Upload medical records and any documents your attorney may need.' }
    : submittedForReview
    ? { tip: 'Your case is under attorney review.', action: plaintiffRoutingStatusMessage || `Attorneys typically respond within ${responseDeadlineLabel}.` }
    : inManualReview
    ? { tip: 'Your case is in team review.', action: 'You can upload missing evidence while we check routing options.' }
    : needsMoreInfo
    ? { tip: 'An attorney needs more information.', action: 'Add documents or details now to keep the review moving.' }
    : notRoutableYet
    ? { tip: 'Your case is not routable yet.', action: 'More evidence or clearer details can improve the next review.' }
    : !hasMedicalRecords ? caseCoachTips[0] : !hasWageLoss ? caseCoachTips[1] : !hasPoliceReport ? caseCoachTips[2] : caseCoachTips[3]

  const scoreFactors = [
    { label: 'Liability', value: liabilityLabel, explanation: liabilityLabel === 'Strong' ? 'The other party appears primarily responsible for the accident.' : liabilityLabel === 'Moderate' ? 'Responsibility for the accident may be shared.' : 'More details about fault would strengthen this factor.', improve: liabilityLabel !== 'Strong' ? 'Provide more details about how the accident occurred and who was at fault.' : null },
    { label: 'Injury Evidence', value: injuryLabel, explanation: injuryLabel === 'Strong' ? 'Your injury appears consistent with the incident description.' : 'Injury details have not been fully documented yet.', improve: injuryLabel !== 'Strong' ? 'Describe your injuries and upload injury photos if available.' : null },
    { label: 'Documentation', value: docLabel, explanation: docLabel === 'Improving' ? 'Some medical documentation has been provided.' : 'Medical records or bills have not been uploaded yet.', improve: docLabel === 'Missing' ? 'Upload medical records or hospital bills to strengthen this factor.' : docLabel === 'Improving' ? 'Add more medical records to further strengthen your case.' : null },
    { label: 'Damages', value: damagesLabel, explanation: damagesLabel === 'Documented' ? 'Lost wages or financial impact has been recorded.' : 'Lost wages or financial impact has not been recorded.', improve: damagesLabel !== 'Documented' ? 'Add wage loss documentation or medical expense records.' : null }
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
      href: `/evidence-upload/${assessmentIdForTasks}`,
    }))
  const evidenceGapTasks = evidenceImpact
    .filter((item) => !item.done)
    .slice(0, 3)
    .map((item) => ({
      label: item.label,
      detail: `${item.impact} estimated impact when added.`,
      done: false,
      href: `/evidence-upload/${assessmentIdForTasks}`,
    }))
  const reviewTask = submittedForReview
    ? {
        label: attorneyMatched ? 'Schedule or prepare for consultation' : 'Wait for attorney review',
        detail: attorneyMatched
          ? hasUpcomingConsult
            ? 'Your consultation is scheduled. Upload any documents your attorney may need.'
            : 'Book a consultation with your matched attorney.'
          : 'You do not need to do anything urgent unless we request more information.',
        done: attorneyMatched && hasUpcomingConsult,
        href: attorneyMatched ? '/messaging' : `/results/${assessmentIdForTasks}`,
      }
    : {
        label: 'Submit for attorney review',
        detail: 'Send your case when you are ready to see attorney matches.',
        done: false,
        href: `/results/${assessmentIdForTasks}?review=1`,
      }
  // Tasks the attorney assigned to the plaintiff come first — these are explicit
  // requests from the legal team, so they take priority over generated tips (#157).
  const attorneyTaskItems = attorneyTasks.map((task) => ({
    label: task.title,
    detail: task.notes?.trim()
      ? task.notes.trim()
      : task.dueDate
      ? `Requested by your attorney — due ${new Date(task.dueDate).toLocaleDateString()}.`
      : 'Requested by your attorney.',
    done: task.status === 'done',
    href: '/messaging',
  }))
  const dashboardTasks = [...attorneyTaskItems, reviewTask, ...evidenceGapTasks, ...scoreImprovementTasks].slice(0, 6 + attorneyTaskItems.length)
  const actionItemsCount = dashboardTasks.filter((task) => !task.done).length

  const riskLevel: 'Low' | 'Moderate' | 'High' = docLabel === 'Missing' ? 'Moderate' : evidenceCount === 0 ? 'Moderate' : 'Low'
  const potentialValueIncrease = !hasNarrative
    ? { msg: 'Completing your accident description could increase your estimated value by $2,000–$5,000.', show: true }
    : evidenceCount === 0
    ? { msg: 'Adding medical records could increase your estimated case value by $5,000–$15,000.', show: true }
    : !hasWageLoss
    ? { msg: 'Adding wage loss documentation could increase your estimated case value by $1,000–$5,000.', show: true }
    : { msg: null, show: false }

  const recentActivity = [
    { label: 'Case created', done: true },
    { label: 'Incident description completed', done: hasNarrative },
    { label: `Case score updated to ${caseScore}`, done: true },
    { label: 'Evidence uploaded', done: evidenceCount > 0 },
    { label: 'Attorney review submitted', done: submittedForReview }
  ]

  const wageLossEstimate = (() => {
    const d = parseInt(wageDays, 10)
    const w = parseFloat(String(wageDaily).replace(/[^0-9.]/g, ''))
    if (d > 0 && w > 0) return d * w
    if (typeof damages.wage_loss === 'number' && damages.wage_loss > 0) return damages.wage_loss
    return null
  })()

  const caseValueHistory = (() => {
    if (Array.isArray(activeAssessment?.caseValueHistory) && activeAssessment.caseValueHistory.length > 0) {
      return [...activeAssessment.caseValueHistory]
        .reverse()
        .map((entry, index, entries) => ({
          label: index === entries.length - 1 ? 'Current estimate' : entry.label,
          shortLabel: index === entries.length - 1 ? 'Current' : index === 0 ? 'Initial' : `V${index + 1}`,
          value: Number(entry.bands?.p75 ?? entry.bands?.median ?? entry.value) || 0,
        }))
    }

    const base = settlementLow
    let v = base
    const entries: { label: string; shortLabel: string; value: number }[] = [{ label: 'Initial estimate', shortLabel: 'Initial', value: base }]
    if (injuries.length > 0) { v = Math.round(v * 1.25); entries.push({ label: 'After injury docs', shortLabel: 'Injury', value: v }) }
    if (evidenceCount > 0) { v = Math.round(v * 1.4); entries.push({ label: 'After evidence', shortLabel: 'Evidence', value: v }) }
    if (hasWageLoss) { v = Math.round(v * 1.15); entries.push({ label: 'After wage loss', shortLabel: 'Wage', value: v }) }
    entries.push({ label: 'Current estimate', shortLabel: 'Current', value: settlementHigh })
    return entries
  })()
  const maxValue = Math.max(...caseValueHistory.map(e => e.value))

  const horizontalSteps = attorneyMatched
    ? [
        { label: 'Incident reported', done: hasNarrative || hasLocation },
        { label: 'Medical treatment', done: injuries.length > 0 },
        { label: 'Evidence uploaded', done: evidenceCount > 0 },
        { label: 'Attorney matched', done: true },
        { label: 'Consultation scheduled', done: hasUpcomingConsult },
        { label: 'Negotiation', done: false },
        { label: 'Resolution', done: false }
      ]
    : [
        { label: 'Incident reported', done: hasNarrative || hasLocation },
        { label: 'Medical treatment', done: injuries.length > 0 },
        { label: 'Evidence uploaded', done: evidenceCount > 0 },
        { label: 'Attorney review', done: submittedForReview },
        { label: 'Negotiation', done: false },
        { label: 'Resolution', done: false }
      ]

  const notification = evidenceCount > 0
    ? 'Your case score increased after evidence upload.'
    : docPercent >= 40
    ? 'Two more documents could significantly increase your estimated value.'
    : null

  const openScheduleModal = () => {
    setScheduleDate(buildUpcomingDateOptions(1)[0]?.value || new Date().toISOString().slice(0, 10))
    setSelectedScheduleSlot('')
    setScheduleError(null)
    setScheduleSuccess(null)
    setScheduleModalOpen(true)
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
    const key = `pain_journal_${activeAssessment.id}`
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
    localStorage.setItem(key, JSON.stringify(updated))
    setJournalEntries(updated)
    // Reset the inputs so the next entry starts from a clean state (#197).
    setPainNote('')
    setWageDays('')
    setWageDaily('')
    setJournalError(null)
    setJournalSaved(true)
    setTimeout(() => setJournalSaved(false), 2500)
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
    if (activeAssessment?.id) {
      localStorage.setItem(`pain_journal_${activeAssessment.id}`, JSON.stringify(updated))
    }
    setJournalEntries(updated)
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


  const handleSendCaseMessage = async () => {
    if (!caseMessageInput.trim() || !routingStatus?.caseChatRoomId || !routingStatus?.attorneyMatched?.id || !activeAssessment?.id) return
    setCaseMessageSending(true)
    try {
      await sendMessage({
        chatRoomId: routingStatus.caseChatRoomId,
        attorneyId: routingStatus.attorneyMatched.id,
        assessmentId: activeAssessment.id,
        content: caseMessageInput.trim(),
        messageType: 'text'
      })
      setCaseMessageInput('')
      const data = await getRoutingStatus(activeAssessment.id)
      setRoutingStatus(data)
    } catch (err: any) {
      console.error('Send message failed', err)
    } finally {
      setCaseMessageSending(false)
    }
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
    try {
      await cancelAppointment(routingStatus.upcomingAppointment.id)
      setScheduleSuccess('Consultation cancelled.')
      const data = await getRoutingStatus(activeAssessment.id)
      setRoutingStatus(data)
    } catch (err: any) {
      setScheduleError(err?.response?.data?.error || 'Could not cancel consultation.')
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
        caseScore,
        caseScoreLabel,
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
      {user.emailVerified === false && (
        <div className="mx-auto w-full max-w-5xl px-4 pb-0 pt-4 sm:px-6 print:hidden">
          <div className="subtle-panel flex flex-col gap-2 px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Email verification is pending. Some secure actions may require verification later.
              </p>
              <button
                type="button"
                disabled={verifySending}
                className="btn-ghost shrink-0 text-xs disabled:opacity-60"
                onClick={() => { void handleRequestVerification() }}
              >
                {verifySending ? 'Sending…' : 'Request verification link'}
              </button>
            </div>
            {verifyNotice && (
              <p
                className={`rounded-md px-3 py-2 ${
                  verifyNotice.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                }`}
                role="status"
              >
                {verifyNotice.text}
              </p>
            )}
          </div>
        </div>
      )}
      {/* Schedule Consultation Modal */}
      {scheduleModalOpen && routingStatus?.attorneyMatched && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="surface-panel my-auto max-h-[90vh] w-full max-w-md overflow-y-auto p-6 shadow-xl">
            <h3 className="section-title text-ui-xl">Schedule Consultation</h3>
            <p className="section-copy mb-4">Book a call with {routingStatus.attorneyMatched.name} to discuss your case.</p>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Choose a day</label>
                <div className="grid grid-cols-2 gap-2">
                  {buildUpcomingDateOptions().map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setScheduleDate(option.value)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium ${
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
                <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
                <select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value as 'phone' | 'video' | 'in_person')}
                  className="select"
                >
                  <option value="phone">Phone</option>
                  <option value="video">Video</option>
                  <option value="in_person">In Person</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Available time slots</label>
                {scheduleSlotsLoading ? (
                  <div className="helpful-empty px-3 py-4">
                    Loading available times...
                  </div>
                ) : scheduleError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-4 text-sm text-red-700">
                    {scheduleError}
                  </div>
                ) : scheduleSlots.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-4 text-sm text-amber-800 space-y-3">
                    <p>No open consultation times for this day yet. Try another date.</p>
                    <button
                      type="button"
                      onClick={handleJoinWaitlist}
                      disabled={waitlistLoading}
                      className="btn-outline bg-white disabled:opacity-60"
                    >
                      {waitlistLoading ? 'Joining waitlist...' : 'Join earlier-slot waitlist'}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {scheduleSlots.map((slot) => (
                      <button
                        key={slot.start}
                        type="button"
                        onClick={() => setSelectedScheduleSlot(slot.start)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium ${
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
                Cancel
              </button>
              <button
                onClick={handleScheduleConsultation}
                disabled={scheduleLoading || !selectedScheduleSlot}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {scheduleLoading ? 'Saving...' : routingStatus?.upcomingAppointment?.id ? 'Confirm Reschedule' : 'Schedule Call'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header + Tab navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl transition-colors dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="font-display text-ui-2xl font-semibold text-slate-950 dark:text-slate-50">Hi {user.firstName}</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {activeAssessment && submittedForReview
                  ? `Your case is currently being reviewed. ${attorneyReviewCount} attorney${attorneyReviewCount !== 1 ? 's are' : ' is'} reviewing your information. Expected response: ${responseDeadlineLabel}. Current estimate: ${formatCurrency(settlementLow)}–${formatCurrency(settlementHigh)}.`
                  : activeAssessment
                  ? `Your case is ${docPercent}% complete.${actionItemsCount > 0 ? ` You have ${actionItemsCount} ${actionItemsCount === 1 ? 'thing' : 'things'} to do next to strengthen your case.` : ''}`
                  : "Let's find out if you may have a personal injury case."}
              </p>
            </div>
            <button
              onClick={() => { clearStoredAuth(); navigate('/') }}
              className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline-offset-2 hover:underline"
            >
              Logout
            </button>
          </div>

          {/* Tab navigation */}
          {activeAssessment && (
            <nav className="-mx-1 flex gap-2 overflow-x-auto pb-1">
              {TABS.map((tab) => {
                const badge = tab.id === 'tasks' ? actionItemsCount : tab.id === 'requested-documents' ? pendingDocumentRequests.length : 0
                return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`workspace-tab whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'workspace-tab-active'
                      : ''
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {badge > 0 && (
                    <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{badge}</span>
                  )}
                </button>
                )
              })}
            </nav>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {activeAssessment ? (
          <>
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Case Status</span>
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${caseStatusColor(plaintiffCaseStatusKey)}`}>
                    {caseStatusLabel(plaintiffCaseStatusKey)}
                  </span>
                </div>
                <CaseProgressPipeline
                  submittedForReview={submittedForReview}
                  attorneyMatched={attorneyMatched}
                  hasScheduledConsult={hasUpcomingConsult}
                  lifecycleState={routingLifecycle}
                  statusMessage={plaintiffRoutingStatusMessage}
                />
                {submittedForReview && (
                  <section className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white shadow-sm">
                    <p className="text-sm font-semibold text-brand-100">Your Case Is Being Reviewed</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-3xl font-bold">{attorneyReviewCount} Attorney{attorneyReviewCount !== 1 ? 's' : ''} Reviewing</p>
                        <p className="mt-1 text-sm text-brand-100">Your information is in attorney review.</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-100">Expected Response</p>
                        <p className="mt-1 text-2xl font-bold">{responseDeadlineLabel}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-100">Case Value</p>
                        <p className="mt-1 text-2xl font-bold">{formatCurrency(settlementLow)} - {formatCurrency(settlementHigh)}</p>
                      </div>
                    </div>
                    <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
                      {reviewProgressItems.map((step, index) => (
                        <div key={step.label} className="flex min-w-[120px] items-center">
                          <div className="flex flex-col">
                            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                              step.done ? 'bg-white text-brand-700' : step.current ? 'bg-brand-100 text-brand-800 ring-2 ring-white/70' : 'bg-white/20 text-white'
                            }`}>
                              {step.done ? '✓' : index + 1}
                            </span>
                            <span className="mt-2 text-xs font-semibold text-brand-50">{step.label}{step.current ? ' (Current)' : ''}</span>
                          </div>
                          {index < reviewProgressItems.length - 1 && <div className={`mx-2 h-0.5 flex-1 ${step.done ? 'bg-white' : 'bg-white/25'}`} />}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {submittedForReview && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-900">
                    <span className="font-semibold">Attorney review does not obligate you.</span>{' '}
                    You decide whether to speak with or hire any attorney who contacts you.
                  </div>
                )}
                {/* Top status banner - changes when attorney accepts */}
                {waitingBanner && !submittedForReview && (
                  <div className={`${waitingBanner.className} premium-panel px-6 py-5`}>
                    <p className="text-xl font-bold">{waitingBanner.title}</p>
                    <p className={`${waitingBanner.subClassName} text-sm mt-1`}>{waitingBanner.subtitle}</p>
                  </div>
                )}

                {submittedForReview && !attorneyMatched && searchExpanded && (
                  <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-6 py-5">
                    <Users className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                    <div>
                      <p className="text-base font-semibold text-blue-900">Expanded Search In Progress</p>
                      <p className="mt-1 text-sm text-blue-800">
                        Your original ranked choices were unavailable, so we expanded the search and contacted additional matching attorneys.
                      </p>
                    </div>
                  </div>
                )}

                {/* Notification banner */}
                {latestNotification && (
                  <div className="flex items-center gap-3 p-4 bg-brand-50 border border-brand-200 rounded-xl">
                    <Bell className="h-5 w-5 text-brand-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-brand-900">New update</p>
                      <p className="text-sm text-brand-700">{latestNotification}</p>
                    </div>
                  </div>
                )}

                {activeAssessment?.id && (
                  <OpposingDocSuggestionCard assessmentId={activeAssessment.id} />
                )}

                {(documentRequests.length > 0 || pendingDocumentRequests.length > 0) && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Action Center</h3>
                        <p className="text-sm text-gray-600">
                          This is the fastest place to see what is still blocking your case and what to upload next.
                        </p>
                      </div>
                      {activeAssessment?.id && (
                        <Link
                          to={`/evidence-upload/${activeAssessment.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 shrink-0"
                        >
                          <Upload className="h-4 w-4" />
                          Upload Documents
                        </Link>
                      )}
                    </div>
                    {nextDocumentRequest && (
                      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <p className="text-sm font-semibold text-amber-900">Most urgent task</p>
                        <p className="text-sm text-amber-800 mt-1">
                          {nextDocumentRequest.attorney?.name || 'Your attorney'} is still waiting on{' '}
                          {nextDocumentRequest.remainingDocs.length > 0
                            ? nextDocumentRequest.remainingDocs.length === 1
                              ? nextDocumentRequest.items.find((item) => item.key === nextDocumentRequest.remainingDocs[0])?.label || 'a requested document'
                              : `${nextDocumentRequest.remainingDocs.length} requested documents`
                            : 'supporting documents'}.
                        </p>
                      </div>
                    )}
                    <div className="space-y-4">
                      {documentRequests.map((request) => {
                        const remainingItems = request.items.filter((item) => !item.fulfilled)
                        const completedItems = request.items.filter((item) => item.fulfilled)
                        const attorneyName = request.attorney?.name || 'Your attorney'
                        return (
                          <div key={request.id} className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                              <div>
                                <p className="font-semibold text-gray-900">{attorneyName}</p>
                                <p className="text-xs text-gray-500">
                                  Requested {new Date(request.createdAt).toLocaleDateString()}
                                  {request.lastNudgeAt ? ` • Reminder sent ${new Date(request.lastNudgeAt).toLocaleDateString()}` : ''}
                                </p>
                              </div>
                              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                request.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : request.status === 'partial'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-blue-100 text-blue-700'
                              }`}>
                                {request.status === 'completed' ? 'Completed' : request.status === 'partial' ? 'Partially complete' : 'Action needed'}
                              </span>
                            </div>
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <span>Task progress</span>
                                <span>{request.completionPercent}% complete</span>
                              </div>
                              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                                <div className="h-full bg-brand-600 rounded-full" style={{ width: `${request.completionPercent}%` }} />
                              </div>
                            </div>
                            {request.customMessage && (
                              <div className="mb-3 rounded-lg bg-white px-3 py-3 border border-gray-200">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Attorney note</p>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.customMessage}</p>
                              </div>
                            )}
                            {remainingItems.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Upload next</p>
                                <div className="flex flex-wrap gap-2">
                                  {remainingItems.map((item) => (
                                    <span key={item.key} className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-medium">
                                      {item.label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {completedItems.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Already completed</p>
                                <div className="flex flex-wrap gap-2">
                                  {completedItems.map((item) => (
                                    <span key={item.key} className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-medium">
                                      {item.label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {request.items.length === 0 && (
                              <p className="text-sm text-gray-600 mb-3">
                                Your attorney asked for any additional supporting documents you may have. Medical records, bills, photos, or insurance documents can all help move your case forward.
                              </p>
                            )}
                            {activeAssessment?.id && (
                              <Link
                                to={`/evidence-upload/${activeAssessment.id}`}
                                className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-800"
                              >
                                <Upload className="h-4 w-4" />
                                Upload to this request
                              </Link>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Case Value Updated banner - when documents increase estimate */}
                {activeAssessment?.caseValueUpdated && (
                  <div className="flex items-start gap-3 p-5 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-900 text-lg">Your case just got stronger</p>
                      <p className="text-sm text-emerald-800 mt-1">
                        {activeAssessment.caseValueUpdated.reason === 'document_upload'
                          ? 'New documents increased your estimated case value.'
                          : 'Your new medical records increased your estimated case value.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm">
                        <span className="text-emerald-700">
                          Previous: {formatCurrency(activeAssessment.caseValueUpdated.previousValue.p25)} – {formatCurrency(activeAssessment.caseValueUpdated.previousValue.p75)}
                        </span>
                        <span className="font-semibold text-emerald-900">
                          Updated: {formatCurrency(activeAssessment.caseValueUpdated.newValue.p25)} – {formatCurrency(activeAssessment.caseValueUpdated.newValue.p75)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ATTORNEY ACCEPTED LAYOUT - Working with attorney */}
                {attorneyMatched ? (
                  <>
                    {/* Attorney Match Card */}
                    <div className="bg-white rounded-xl border-2 border-emerald-200 p-6 shadow-sm">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <CheckCircle className="h-6 w-6 text-emerald-600" />
                        Attorney Match
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex-1">
                          <p className="text-xl font-bold text-gray-900">{routingStatus?.attorneyMatched?.name}, Esq.</p>
                          <p className="text-gray-600 mt-1">{routingStatus?.attorneyMatched?.firmName || 'Law Firm'}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {routingStatus?.attorneyMatched?.yearsExperience ? `${routingStatus.attorneyMatched.yearsExperience} years experience` : 'Experienced attorney'}
                            {venueState ? ` • ${venueState} licensed` : ''}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {(() => {
                              const s = routingStatus?.attorneyMatched?.specialties
                              if (!s) return null
                              try {
                                const arr = typeof s === 'string' ? JSON.parse(s) : s
                                if (Array.isArray(arr)) {
                                  // Format every stored specialty slug so none render
                                  // with raw underscores (e.g. dog_bite, wrongful_death).
                                  const formatted = arr.map((x: string) => formatClaimTypeShort(x)).filter(Boolean)
                                  return `Specializes in ${formatted.join(', ') || 'Personal Injury'}`
                                }
                              } catch {}
                              return `Specializes in ${formatClaimTypeShort(String(s))}`
                            })()}
                          </p>
                          <p className="text-sm text-brand-600 mt-1">
                            Typical response time: within {routingStatus?.attorneyMatched?.responseTimeHours ?? 24} hours
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={routingStatus?.attorneyMatched?.phone ? `tel:${routingStatus.attorneyMatched.phone}` : '#'}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                          >
                            <Phone className="h-4 w-4" />
                            Call
                          </a>
                          <Link
                            to="/messaging"
                            state={{ attorneyId: routingStatus?.attorneyMatched?.id, assessmentId: activeAssessment?.id }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-emerald-600 text-emerald-700 rounded-lg hover:bg-emerald-50 text-sm font-medium"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Message
                          </Link>
                          {/* Once an attorney has accepted the case, the plaintiff is
                              working with them, so browsing other attorneys is hidden (#141). */}
                        </div>
                      </div>
                    </div>

                    {/* Plaintiff satisfaction */}
                    <PlaintiffSatisfactionCard assessmentId={activeAssessment?.id} />

                    {/* Schedule Consultation | Next Best Action */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {hasUpcomingConsult ? (
                        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5">
                          <h3 className="text-lg font-bold text-emerald-900 mb-2">Consultation Scheduled</h3>
                          <p className="text-emerald-800 font-medium">
                            {routingStatus?.upcomingAppointment?.attorney?.name}
                          </p>
                          <p className="text-sm text-emerald-700 mt-1">
                            {new Date(routingStatus?.upcomingAppointment?.scheduledAt || '').toLocaleString('en-US', {
                              weekday: 'long',
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </p>
                          <p className="text-xs text-emerald-600 mt-1 capitalize">
                            {routingStatus?.upcomingAppointment?.type?.replace('_', ' ')} consultation
                          </p>
                          {scheduleSuccess && (
                            <p className="mt-2 text-xs text-emerald-700">{scheduleSuccess}</p>
                          )}
                          <div className="flex gap-2 mt-4 flex-wrap">
                            {routingStatus?.attorneyMatched?.phone && (
                              <a href={`tel:${routingStatus.attorneyMatched.phone}`} className="text-sm font-medium text-emerald-700 hover:underline">Join Call</a>
                            )}
                            <button onClick={openScheduleModal} className="text-sm font-medium text-emerald-700 hover:underline">Reschedule</button>
                            <button onClick={handleCancelConsultation} className="text-sm font-medium text-emerald-700 hover:underline">Cancel</button>
                            <Link to="/messaging" state={{ attorneyId: routingStatus?.attorneyMatched?.id, assessmentId: activeAssessment?.id }} className="text-sm font-medium text-emerald-700 hover:underline">Message</Link>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                          <h3 className="text-lg font-bold text-gray-900 mb-2">Schedule Consultation</h3>
                          <p className="text-sm text-gray-600 mb-4">Book a call with your attorney to discuss your case.</p>
                          <button
                            onClick={openScheduleModal}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                          >
                            <Calendar className="h-4 w-4" />
                            Schedule Consultation
                          </button>
                        </div>
                      )}
                      <div className="bg-brand-600 rounded-xl p-5 min-h-[180px] flex flex-col">
                        <h2 className="text-lg font-bold mb-2 text-white">Next Best Action</h2>
                        <p className="text-lg text-brand-100 mb-1">{dailyAction.action}</p>
                        <p className="text-sm text-brand-200 mb-3">{dailyAction.valueIncrease}</p>
                        {dailyAction.isSchedule && !hasUpcomingConsult ? (
                          <button onClick={openScheduleModal} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-white text-brand-600 rounded-lg hover:bg-brand-50 mt-auto">
                            <Calendar className="h-4 w-4" />
                            Schedule Consultation
                          </button>
                        ) : (
                          <Link to={`/evidence-upload/${activeAssessment.id}`} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-white text-brand-600 rounded-lg hover:bg-brand-50 mt-auto w-fit">
                            <Upload className="h-4 w-4" />
                            Upload Evidence
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Consultation prep - when consultation is scheduled */}
                    {hasUpcomingConsult && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                        <h3 className="text-sm font-bold text-amber-900 mb-2">Pre-consult checklist</h3>
                        <div className="space-y-2">
                          {(routingStatus?.upcomingAppointment?.preparation?.prepItems || []).map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-100 bg-white px-3 py-2">
                              <div>
                                <p className="text-sm text-amber-900">{item.label}</p>
                                <p className="text-xs text-amber-700 capitalize">{item.isRequired ? 'Required' : 'Recommended'} • {item.status}</p>
                              </div>
                              <button
                                onClick={() => handleUpdatePrepStatus(item.id, item.status === 'completed' ? 'pending' : 'completed')}
                                disabled={prepSaving}
                                className="text-xs font-medium text-amber-800 hover:underline disabled:opacity-60"
                              >
                                {item.status === 'completed' ? 'Mark pending' : 'Mark done'}
                              </button>
                            </div>
                          ))}
                        </div>
                        <textarea
                          value={prepNotes}
                          onChange={(e) => setPrepNotes(e.target.value)}
                          placeholder="Add any questions or notes you want ready before the consult."
                          className="mt-3 w-full rounded-lg border border-amber-200 px-3 py-2 text-sm text-gray-700"
                          rows={3}
                        />
                        <div className="mt-3 flex flex-wrap gap-3">
                          <button
                            onClick={handleSavePrepNotes}
                            disabled={prepSaving}
                            className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                          >
                            {prepSaving ? 'Saving...' : 'Save prep'}
                          </button>
                          {routingStatus?.upcomingAppointment?.preparation?.waitlistStatus && (
                            <span className="self-center text-xs text-amber-800 capitalize">
                              Earlier-slot waitlist: {routingStatus.upcomingAppointment.preparation.waitlistStatus}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Attorney viewed signal */}
                    {routingStatus?.attorneyActivity?.some((a: any) => a.type === 'viewed') && (
                      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                        <Activity className="h-4 w-4" />
                        Attorney viewed your case {routingStatus.attorneyActivity.find((a: any) => a.type === 'viewed')?.timeAgo || 'recently'}
                      </div>
                    )}

                    {/* Attorney Contact Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="text-lg font-bold text-gray-900 mb-3">Your Attorney</h3>
                      <p className="font-medium text-gray-900">{routingStatus?.attorneyMatched?.name}, Esq.</p>
                      <p className="text-gray-600 text-sm">{routingStatus?.attorneyMatched?.firmName}</p>
                      <div className="mt-3 space-y-1 text-sm">
                        {routingStatus?.attorneyMatched?.phone && (
                          <p className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <a href={`tel:${routingStatus.attorneyMatched.phone}`} className="text-brand-600 hover:underline">{routingStatus.attorneyMatched.phone}</a>
                          </p>
                        )}
                        {routingStatus?.attorneyMatched?.email && (
                          <p className="flex items-center gap-2 text-gray-600">
                            <span className="text-gray-500">{routingStatus.attorneyMatched.email}</span>
                          </p>
                        )}
                        <p className="text-gray-600">
                          Response time: within about {routingStatus?.attorneyMatched?.responseTimeHours ?? 24} hours
                        </p>
                        <p className="text-brand-600">
                          {(routingStatus?.attorneyMatched?.responseTimeHours ?? 24) <= 2
                            ? 'Fast responder'
                            : (routingStatus?.attorneyMatched?.responseTimeHours ?? 24) <= 8
                              ? 'Same-day replies'
                              : 'Typically replies within 24h'}
                        </p>
                      </div>
                      <div className="flex gap-2 mt-4">
                        {routingStatus?.attorneyMatched?.phone && (
                          <a href={`tel:${routingStatus.attorneyMatched.phone}`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">Call</a>
                        )}
                        <Link to="/messaging" state={{ attorneyId: routingStatus?.attorneyMatched?.id, assessmentId: activeAssessment?.id }} className="inline-flex items-center gap-1 px-3 py-1.5 border border-emerald-600 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50">Message</Link>
                        <button onClick={openScheduleModal} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Schedule Consultation</button>
                      </div>
                      {routingStatus?.upcomingAppointment?.reviewEligible && (
                        <div className="mt-4 border-t border-gray-100 pt-4">
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
                                placeholder="Short review title"
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                              />
                              <textarea
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                placeholder="Share how the consultation went."
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <button onClick={handleSubmitReview} disabled={reviewSubmitting} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
                                  {reviewSubmitting ? 'Submitting...' : 'Submit review'}
                                </button>
                                <button onClick={() => setReviewOpen(false)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                                  Close
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setReviewOpen(true)} className="text-sm font-medium text-brand-600 hover:underline">
                              Leave a verified review
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Case Messages - in-platform messaging */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-brand-600" />
                        Case Messages
                      </h3>
                      <div className="space-y-3">
                        {routingStatus?.caseMessages && routingStatus.caseMessages.length > 0 ? (
                          routingStatus.caseMessages.map((m, i) => (
                            <div
                              key={i}
                              className={`p-4 rounded-lg border ${
                                m.from === 'plaintiff' ? 'bg-brand-50 border-brand-200 ml-8' : 'bg-gray-50 border-gray-200 mr-8'
                              }`}
                            >
                              <p className="text-xs font-medium text-gray-500 mb-1">
                                {m.from === 'plaintiff' ? 'You' : routingStatus?.attorneyMatched?.name}
                              </p>
                              {m.subject && <p className="font-medium text-gray-900 text-sm">{m.subject}</p>}
                              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{m.message}</p>
                              <p className="text-xs text-gray-500 mt-2">{new Date(m.createdAt).toLocaleString()}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">No messages yet. Your attorney may contact you here with document requests or scheduling updates.</p>
                        )}
                      </div>
                      {routingStatus?.caseChatRoomId && routingStatus?.attorneyMatched?.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={caseMessageInput}
                              onChange={(e) => setCaseMessageInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendCaseMessage())}
                              placeholder="Type a message..."
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 text-sm"
                              disabled={caseMessageSending}
                            />
                            <button
                              onClick={handleSendCaseMessage}
                              disabled={!caseMessageInput.trim() || caseMessageSending}
                              className="inline-flex items-center gap-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 text-sm font-medium"
                            >
                              <Send className="h-4 w-4" />
                              Send
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Header metric cards */}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">Case Strength</p>
                        <p className="mt-1 text-3xl font-bold text-emerald-600 tabular-nums">{caseScore}<span className="text-sm font-medium text-gray-400"> / 100</span></p>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${caseScore}%` }} /></div>
                        <p className="mt-1.5 text-xs font-medium text-emerald-600">{caseStrengthFriendly} Case</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">Attorney Interest</p>
                        <div className="mt-1 flex items-center justify-between">
                          <div>
                            <p className="text-lg font-bold text-emerald-600">{attorneyInterestLabel}</p>
                            <p className="text-2xl font-bold text-gray-900 tabular-nums">{attorneyInterest}%</p>
                          </div>
                          <div className="relative inline-flex h-12 w-12 items-center justify-center">
                            <svg className="absolute h-12 w-12 -rotate-90 text-gray-200" viewBox="0 0 36 36" aria-hidden>
                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" className="text-emerald-500" strokeWidth="4" strokeDasharray={`${attorneyInterest} ${100 - attorneyInterest}`} strokeLinecap="round" />
                            </svg>
                          </div>
                        </div>
                        <p className="mt-1 text-[11px] text-gray-400">Likelihood of attorney interest</p>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">Settlement Range</p>
                        <p className="mt-1 text-lg font-bold text-gray-900 tabular-nums">{formatCurrency(settlementLow)} – {formatCurrency(settlementHigh)}</p>
                        <p className="text-[11px] text-gray-400">Most likely: {formatCurrency(settlementMedian)}</p>
                        <div className="relative mt-2 h-1.5 w-full rounded-full bg-gray-200"><div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600" /></div>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">Expected Response</p>
                        <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold text-blue-600"><Clock className="h-5 w-5" aria-hidden />{responseDeadlineLabel}</p>
                        <p className="text-[11px] text-gray-400">Average response time</p>
                      </div>
                    </div>

                    {/* Attorney Review Status + What happens next */}
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl bg-slate-900 p-5 text-white">
                        <p className="text-sm font-semibold text-slate-200">Attorney Review Status</p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <ul className="space-y-3">
                            {[
                              { label: 'Case submitted', done: submittedForReview, time: submittedForReview ? 'Done' : 'Pending' },
                              { label: 'Matched to personal injury attorneys', done: submittedForReview, time: submittedForReview ? 'In queue' : '—' },
                              { label: 'Under attorney review', done: false, time: submittedForReview ? 'In progress' : '—' },
                              { label: 'Response expected', done: false, time: `~${responseDeadlineLabel}` },
                            ].map((s) => (
                              <li key={s.label} className="flex items-start gap-2">
                                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${s.done ? 'bg-emerald-500' : 'border border-slate-500'}`}>{s.done && <CheckCircle className="h-3 w-3 text-white" aria-hidden />}</span>
                                <span className="flex-1 text-xs text-slate-200">{s.label}</span>
                                <span className="text-[10px] text-slate-400">{s.time}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="flex flex-col items-center justify-center rounded-lg bg-white/5 p-4 text-center">
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10"><Users className="h-6 w-6 text-slate-200" aria-hidden /></span>
                            <p className="mt-2 text-2xl font-bold">{submittedForReview ? attorneyReviewCount : 0} Attorney{(submittedForReview ? attorneyReviewCount : 0) === 1 ? '' : 's'}</p>
                            <p className="text-[11px] text-slate-300">{submittedForReview ? 'Currently reviewing your case' : 'Submit to start review'}</p>
                            <Link to={`/results/${activeAssessment.id}`} className="mt-3 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-100">View Review Details</Link>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <p className="text-sm font-semibold text-gray-900">What happens next?</p>
                        <ul className="mt-4 space-y-3">
                          {reviewStatusSteps.map((s, i) => (
                            <li key={s.label} className="flex items-start gap-3">
                              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${s.done ? 'bg-emerald-500 text-white' : s.current ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' : 'bg-gray-100 text-gray-400'}`}>{s.done ? '✓' : i + 1}</span>
                              <div>
                                <p className="text-xs font-semibold text-gray-800">{s.label}</p>
                                <p className="text-[11px] text-gray-400">{s.sub}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                        <Link to={`/results/${activeAssessment.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900">Learn more about the process <ChevronRight className="h-3.5 w-3.5" /></Link>
                      </div>
                    </div>

                    {/* Increase value + Potential matches */}
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <p className="text-sm font-semibold text-gray-900">Increase Your Case Value</p>
                        <p className="mt-0.5 text-xs text-gray-500">Upload key documents to improve value, confidence, and attorney interest.</p>
                        <div className="mt-4 space-y-2">
                          {caseValueIncreaseItems.map((item) => (
                            <div key={item.label} className="flex items-center gap-3 rounded-lg border border-gray-200 p-2.5">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><FileText className="h-4 w-4" aria-hidden /></span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-gray-800">{item.label}</p>
                                <p className="truncate text-[11px] text-gray-400">{item.sub}</p>
                              </div>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.impact === 'High' ? 'bg-emerald-50 text-emerald-700' : item.impact === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{item.impact}</span>
                              {item.done ? (
                                <span className="shrink-0 text-[11px] font-semibold text-emerald-600">Added</span>
                              ) : (
                                <Link to={`/evidence-upload/${activeAssessment.id}`} className="shrink-0 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50">Upload</Link>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <p className="flex items-center gap-1.5 text-[11px] text-emerald-700"><TrendingUp className="h-3.5 w-3.5" aria-hidden />Adding these items could increase your settlement.</p>
                          <Link to={`/evidence-upload/${activeAssessment.id}`} className="text-[11px] font-semibold text-brand-700 hover:text-brand-900">See all ways to strengthen</Link>
                        </div>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <p className="text-sm font-semibold text-gray-900">Potential Attorney Matches</p>
                        <p className="mt-0.5 text-xs text-gray-500">Matches are based on your case details and location.</p>
                        <div className="mt-4 space-y-3">
                          {previewAttorneyMatches.map((a) => (
                            <div key={a.firm} className="flex items-start gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">{a.firm.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-gray-900">{a.firm}</p>
                                <p className="truncate text-[11px] text-gray-500">{a.focus}</p>
                                <p className="truncate text-[11px] text-gray-400">{venueState}</p>
                                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-600"><Star className="h-3 w-3" aria-hidden />{a.rating} ({a.reviews} reviews)</p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-[10px] text-gray-400">Match Score</p>
                                <p className="text-sm font-bold text-emerald-600">{a.score}%</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] text-gray-500">Submit your case to unlock full attorney profiles and contact information.</p>
                      </div>
                    </div>

                    {/* Secondary metrics row */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <p className="text-sm font-semibold text-gray-900">Liability Strength</p>
                        <p className="mt-1 text-2xl font-bold text-emerald-600 tabular-nums">{liabilityPercent}% <span className="text-sm font-semibold text-gray-500">{liabilityLabel}</span></p>
                        <p className="mt-3 text-[11px] font-semibold text-gray-700">What helps your case</p>
                        <ul className="mt-1 space-y-1">
                          {(liabilityHelps.length > 0 ? liabilityHelps : ['Incident details provided']).map((h) => (
                            <li key={h} className="flex items-center gap-1.5 text-[11px] text-gray-600"><CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />{h}</li>
                          ))}
                        </ul>
                        {liabilityHurts.length > 0 && (
                          <>
                            <p className="mt-2 text-[11px] font-semibold text-gray-700">What hurts your case</p>
                            <ul className="mt-1 space-y-1">
                              {liabilityHurts.map((h) => (
                                <li key={h} className="flex items-center gap-1.5 text-[11px] text-gray-500"><Square className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />{h}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <p className="text-sm font-semibold text-gray-900">Settlement Likelihood</p>
                        <div className="mt-3 flex items-center justify-center">
                          <div className="relative inline-flex h-20 w-20 items-center justify-center">
                            <svg className="absolute h-20 w-20 -rotate-90 text-gray-200" viewBox="0 0 36 36" aria-hidden>
                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.4" />
                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" className="text-emerald-500" strokeWidth="3.4" strokeDasharray={`${settlementLikelihood} ${100 - settlementLikelihood}`} strokeLinecap="round" />
                            </svg>
                            <div className="relative text-center"><p className="text-lg font-bold text-gray-900 tabular-nums">{settlementLikelihood}%</p><p className="text-[9px] text-emerald-600">High</p></div>
                          </div>
                        </div>
                        <p className="mt-2 text-[11px] font-semibold text-gray-700">Based on:</p>
                        <ul className="mt-1 space-y-1 text-[11px] text-gray-600">
                          <li className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-emerald-500" aria-hidden />Injury severity</li>
                          <li className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-emerald-500" aria-hidden />Treatment consistency</li>
                          <li className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-emerald-500" aria-hidden />Jurisdiction &amp; venue</li>
                          <li className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-emerald-500" aria-hidden />Liability factors</li>
                        </ul>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <p className="text-sm font-semibold text-gray-900">Similar Cases in {venueState}</p>
                        <div className="mt-3 space-y-2">
                          <div className="rounded-lg bg-gray-50 p-2.5"><p className="text-[10px] text-gray-500">Median Settlement</p><p className="text-sm font-bold text-gray-900">{formatCurrency(settlementMedian)}</p></div>
                          <div className="rounded-lg bg-gray-50 p-2.5"><p className="text-[10px] text-gray-500">Top 25%</p><p className="text-sm font-bold text-gray-900">{formatCurrency(potentialSettlementHigh)}</p></div>
                          <div className="rounded-lg bg-gray-50 p-2.5"><p className="text-[10px] text-gray-500">Average Time to Resolve</p><p className="text-sm font-bold text-gray-900">6 – 12 months</p></div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <p className="text-sm font-semibold text-gray-900">Case Readiness</p>
                        <div className="mt-3 flex items-center justify-center">
                          <div className="relative inline-flex h-20 w-20 items-center justify-center">
                            <svg className="absolute h-20 w-20 -rotate-90 text-gray-200" viewBox="0 0 36 36" aria-hidden>
                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.4" />
                              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" className="text-emerald-500" strokeWidth="3.4" strokeDasharray={`${evidencePercent} ${100 - evidencePercent}`} strokeLinecap="round" />
                            </svg>
                            <div className="relative text-center"><p className="text-lg font-bold text-gray-900 tabular-nums">{evidencePercent}%</p></div>
                          </div>
                        </div>
                        {strengthOpportunities.length > 0 ? (
                          <>
                            <p className="mt-2 text-[11px] font-semibold text-gray-700">Missing items</p>
                            <ul className="mt-1 space-y-1">
                              {strengthOpportunities.slice(0, 3).map((o) => (
                                <li key={o.label} className="flex items-center gap-1.5 text-[11px] text-gray-500"><Square className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />{o.label}</li>
                              ))}
                            </ul>
                          </>
                        ) : (
                          <p className="mt-2 text-[11px] text-emerald-600">Your core documents are uploaded.</p>
                        )}
                        <Link to={`/evidence-upload/${activeAssessment.id}`} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-900">See all missing documents <ChevronRight className="h-3 w-3" /></Link>
                      </div>
                    </div>

                    {/* Case Coach + Attorney Messages */}
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white"><Activity className="h-5 w-5" aria-hidden /></span>
                          <p className="text-sm font-semibold text-brand-900">Case Coach <span className="text-[10px] font-medium text-brand-500">(AI Powered)</span></p>
                        </div>
                        <p className="mt-3 text-xs font-semibold text-brand-900">{caseCoachDisplay.tip}</p>
                        <p className="mt-1 text-xs text-brand-800">{caseCoachDisplay.action}</p>
                        <Link to={dailyAction.href} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700">{dailyAction.cta}</Link>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-5 w-5 text-brand-600" aria-hidden />
                          <p className="text-sm font-semibold text-gray-900">Attorney Messages</p>
                        </div>
                        <div className="mt-4 rounded-lg bg-gray-50 p-4 text-center">
                          <p className="text-xs text-gray-600">No new messages yet.</p>
                          <p className="mt-1 text-[11px] text-gray-400">Attorneys typically respond within 1 business day.</p>
                        </div>
                      </div>
                    </div>

                    {/* Case Summary + Coach tip */}
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <p className="text-sm font-semibold text-gray-900">Case Summary</p>
                        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                          <div><dt className="text-gray-400">Type of Case</dt><dd className="font-semibold text-gray-800">{claimTypeLabel}</dd></div>
                          <div><dt className="text-gray-400">Injuries</dt><dd className="font-semibold text-gray-800">{injuryTokens.length > 0 ? injuryTokens.slice(0, 3).join(', ') : 'Not documented'}</dd></div>
                          {incidentDateLabel && (<div><dt className="text-gray-400">Incident Date</dt><dd className="font-semibold text-gray-800">{incidentDateLabel}</dd></div>)}
                          <div><dt className="text-gray-400">Treatment Status</dt><dd className="font-semibold text-gray-800">{treatmentStatusLabel}</dd></div>
                          <div><dt className="text-gray-400">Jurisdiction</dt><dd className="font-semibold text-gray-800">{venueState}</dd></div>
                        </dl>
                        <Link to={`/results/${activeAssessment.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900">View full case details <ChevronRight className="h-3.5 w-3.5" /></Link>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500"><HelpCircle className="h-4 w-4" aria-hidden /></span>
                          <p className="text-sm font-semibold text-gray-900">Case Coach Tip</p>
                        </div>
                        <p className="mt-3 text-xs text-gray-600">The sooner you complete your documentation, the stronger your case and the faster you may receive offers.</p>
                        <Link to="/help" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900">Read more tips <ChevronRight className="h-3.5 w-3.5" /></Link>
                      </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Star className="h-5 w-5" aria-hidden /></span>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Ready to see which attorneys want your case?</p>
                            <p className="text-xs text-gray-500">Submit now and typically receive responses within one business day.</p>
                          </div>
                        </div>
                        <div className="text-center sm:text-right">
                          <Link to={submittedForReview ? `/results/${activeAssessment.id}` : `/results/${activeAssessment.id}?review=1`} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-brand-800 sm:w-auto">
                            {submittedForReview ? 'View Case Report' : 'Send My Case for Attorney Review'}
                            <ChevronRight className="h-4 w-4" aria-hidden />
                          </Link>
                          <p className="mt-1.5 text-[11px] text-gray-400">No obligation • Free review • Cancel anytime</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Legacy grid retained for the attorney-matched experience */}
                {attorneyMatched && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Row 1: Upload Evidence | Case Progress */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5 min-h-[280px] flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Ways To Strengthen Your Case</h3>
                    <p className="text-sm text-gray-600 mb-4">Current Strength: <span className="font-semibold text-brand-700">{caseStrengthFriendly}</span></p>
                    <div className="space-y-3">
                      {(strengthOpportunities.length > 0 ? strengthOpportunities : [{ label: 'Core documents uploaded', impact: 'Good progress' }]).map((item) => (
                        <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
                          <span className="flex items-center gap-2 text-gray-800">
                            <Square className="h-4 w-4 text-gray-300" />
                            {item.label}
                          </span>
                          <span className="text-xs font-semibold text-brand-700">{item.impact}</span>
                        </div>
                      ))}
                    </div>
                    <Link to={`/evidence-upload/${activeAssessment.id}`} className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 w-fit">
                      <Upload className="h-4 w-4" />
                      Upload Document
                    </Link>
                    <Link to={`/demand/${activeAssessment.id}`} className="inline-flex items-center gap-2 mt-2 px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 w-fit">
                      <FileText className="h-4 w-4" />
                      Build Demand Package
                    </Link>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5 min-h-[280px] flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">What Happens Next?</h3>
                    <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li><span className="font-semibold text-gray-900">Today</span> - Attorney review</li>
                        <li><span className="font-semibold text-gray-900">1-3 days</span> - Attorney contact</li>
                        <li><span className="font-semibold text-gray-900">1-3 months</span> - Treatment and negotiation</li>
                        <li><span className="font-semibold text-gray-900">6-12 months</span> - Potential resolution</li>
                      </ul>
                    </div>
                    <details className="mt-auto rounded-lg border border-gray-200 bg-white px-3 py-3">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-gray-700">Show full progress tracker</summary>
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 mt-4">
                        {horizontalSteps.map((step, i) => (
                          <div key={step.label} className="flex items-center shrink-0">
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                step.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                              }`}>
                                {step.done ? '✓' : i + 1}
                              </div>
                              <span className="text-xs text-gray-600 mt-1 text-center max-w-[80px]">{step.label}</span>
                            </div>
                            {i < horizontalSteps.length - 1 && (
                              <div className={`w-8 h-0.5 shrink-0 mx-1 ${step.done ? 'bg-green-500' : 'bg-gray-200'}`} />
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>

                  {/* Row 2: Estimated Value | Strengthening Opportunities */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5 min-h-[280px] flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-brand-600" />
                      Estimated Value
                    </h3>
                    <div className="space-y-3">
                      <div className="rounded-lg border border-brand-100 bg-brand-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Current Estimate</p>
                        <p className="mt-1 text-2xl font-bold text-brand-950">{formatCurrency(settlementLow)} - {formatCurrency(settlementHigh)}</p>
                        <p className="mt-1 text-sm text-brand-700">Confidence: Medium</p>
                      </div>
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Potential Estimate After Additional Records</p>
                        <p className="mt-1 text-2xl font-bold text-emerald-950">{formatCurrency(potentialSettlementLow)} - {formatCurrency(potentialSettlementHigh)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5 min-h-[280px] flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Biggest Opportunities</h3>
                    <div className="space-y-3">
                      {strengthOpportunities.slice(0, 3).map((item) => (
                        <div key={item.label} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                          <p className="text-xs text-brand-700 mt-1">{item.impact}</p>
                        </div>
                      ))}
                      {strengthOpportunities.length === 0 && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                          <p className="text-sm font-semibold text-emerald-900">Your main documents are uploaded</p>
                          <p className="text-xs text-emerald-700 mt-1">Attorneys have the core materials they need to review faster.</p>
                        </div>
                      )}
                    </div>
                    <Link to={`/evidence-upload/${activeAssessment.id}`} className="mt-auto inline-flex w-fit items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                      <Upload className="h-4 w-4" />
                      Upload Document
                    </Link>
                  </div>

                  {/* Row 3: Attorney Messages (only when NOT attorney matched - we show Case Messages above when matched) | Cases like yours */}
                  {!attorneyMatched && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 min-h-[220px] flex flex-col">
                      <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-brand-600" />
                        Attorney Messages
                      </h3>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center flex-1 flex flex-col justify-center">
                        <p className="text-gray-600">No attorney messages yet.</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {waitingState ? 'This is normal while your case is under team review.' : "You'll see responses here when attorneys contact you."}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="bg-white rounded-xl border border-gray-200 p-5 min-h-[220px] flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Similar Cases in {venueState}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-brand-50 rounded-lg">
                        <p className="text-xs font-medium text-brand-600">Typical settlement</p>
                        <p className="text-lg font-bold text-brand-900">{formatCurrency(settlementMedian)}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-500">Typical resolution</p>
                        <p className="text-sm font-semibold text-gray-900">6-12 months</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                        <p className="text-xs font-medium text-gray-500 mb-2">Most common factors</p>
                        <div className="flex flex-wrap gap-2">
                          {commonSimilarFactors.map((factor) => (
                            <span key={factor} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 border border-gray-200">
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                              {factor}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Case Coach | Need help? */}
                  <div className="bg-brand-50 border border-brand-100 rounded-xl p-5 min-h-[140px] flex flex-col">
                    <h3 className="text-lg font-semibold text-brand-900 mb-2">Case Coach</h3>
                    <p className="text-sm text-brand-800 mb-1">Tip: {caseCoachDisplay.tip}</p>
                    <p className="text-sm text-brand-700 font-medium mt-auto">{caseCoachDisplay.action}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 min-h-[160px] flex flex-col justify-end">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-gray-500" />
                      Need help?
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      <Link to="/help" className="text-sm font-medium text-brand-600 hover:text-brand-700">Chat with support</Link>
                      <a href="mailto:support@clearcaseiq.com" className="text-sm font-medium text-brand-600 hover:text-brand-700">Email support</a>
                    </div>
                  </div>
                </div>
                )}

                {submittedForReview && (
                  <details className="group rounded-xl border border-gray-200 bg-white p-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-gray-700">
                      <span>Advanced Details</span>
                      <ChevronRight className="h-4 w-4 text-gray-400 transition-transform duration-200 group-open:rotate-90" aria-hidden />
                    </summary>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-xs font-medium text-gray-500">Case Health</p>
                        <p className="font-semibold text-gray-900">{caseScore}%</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-xs font-medium text-gray-500">Liability</p>
                        <p className="font-semibold text-gray-900">{liabilityLabel}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-xs font-medium text-gray-500">Evidence Score</p>
                        <p className="font-semibold text-gray-900">{evidencePercent}%</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-xs font-medium text-gray-500">Damages</p>
                        <p className="font-semibold text-gray-900">{damagesLabel}</p>
                      </div>
                    </div>
                    {routingTimelineItems.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Routing Timeline</p>
                        {routingTimelineItems.map((item, index) => (
                          <div key={`${item.title}-${index}`} className={`rounded-lg border px-4 py-3 ${item.tone}`}>
                            <p className="text-sm font-semibold">{item.title}</p>
                            <p className="text-xs mt-1 opacity-90">{item.detail}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </details>
                )}

                {/* My Cases - full width at bottom (only when user has 2+ cases) */}
                {assessments.length > 1 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 mt-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">My Cases</h3>
                    <div className="space-y-3">
                      {assessments.map((a) => {
                        const claimLabel = a.claimType === 'auto' ? 'Car Accident' : a.claimType === 'slip_and_fall' ? 'Slip and Fall' : a.claimType === 'medmal' ? 'Medical Malpractice' : 'Personal Injury'
                        const location = a.venue?.state ? ` – ${a.venue.state}` : ''
                        const status = a.submittedForReview ? 'Under Attorney Review' : 'Assessment In Progress'
                        const isActive = a.id === activeAssessment?.id
                        return (
                          <Link
                            key={a.id}
                            to={`/dashboard?case=${a.id}`}
                            className={`block p-4 rounded-lg border transition-colors ${
                              isActive ? 'border-brand-300 bg-brand-50' : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">{claimLabel}{location}</p>
                                <p className="text-sm text-gray-600 mt-1">Status: {status}</p>
                              </div>
                              <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requested-documents' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Requested Documents</h3>
                      <p className="text-sm text-gray-600">
                        Documents your attorney has asked you to provide. Upload them here to keep your case moving.
                      </p>
                    </div>
                    {activeAssessment?.id && (
                      <Link
                        to={`/evidence-upload/${activeAssessment.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 shrink-0"
                      >
                        <Upload className="h-4 w-4" />
                        Upload Documents
                      </Link>
                    )}
                  </div>
                  {documentRequests.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
                      <FileText className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                      <p className="text-sm font-medium text-gray-700">No document requests yet</p>
                      <p className="text-sm text-gray-500 mt-1">
                        When your attorney requests documents, they'll appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {documentRequests.map((request) => {
                        const remainingItems = request.items.filter((item) => !item.fulfilled)
                        const completedItems = request.items.filter((item) => item.fulfilled)
                        const attorneyName = request.attorney?.name || 'Your attorney'
                        return (
                          <div key={request.id} className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                              <div>
                                <p className="font-semibold text-gray-900">{attorneyName}</p>
                                <p className="text-xs text-gray-500">
                                  Requested {new Date(request.createdAt).toLocaleDateString()}
                                  {request.lastNudgeAt ? ` • Reminder sent ${new Date(request.lastNudgeAt).toLocaleDateString()}` : ''}
                                </p>
                              </div>
                              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                request.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : request.status === 'partial'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-blue-100 text-blue-700'
                              }`}>
                                {request.status === 'completed' ? 'Completed' : request.status === 'partial' ? 'Partially complete' : 'Action needed'}
                              </span>
                            </div>
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <span>Task progress</span>
                                <span>{request.completionPercent}% complete</span>
                              </div>
                              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                                <div className="h-full bg-brand-600 rounded-full" style={{ width: `${request.completionPercent}%` }} />
                              </div>
                            </div>
                            {request.customMessage && (
                              <div className="mb-3 rounded-lg bg-white px-3 py-3 border border-gray-200">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Attorney note</p>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.customMessage}</p>
                              </div>
                            )}
                            {remainingItems.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Upload next</p>
                                <div className="flex flex-wrap gap-2">
                                  {remainingItems.map((item) => (
                                    <span key={item.key} className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-medium">
                                      {item.label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {completedItems.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Already completed</p>
                                <div className="flex flex-wrap gap-2">
                                  {completedItems.map((item) => (
                                    <span key={item.key} className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-medium">
                                      {item.label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {request.items.length === 0 && (
                              <p className="text-sm text-gray-600 mb-3">
                                Your attorney asked for any additional supporting documents you may have. Medical records, bills, photos, or insurance documents can all help move your case forward.
                              </p>
                            )}
                            {activeAssessment?.id && (
                              <Link
                                to={`/evidence-upload/${activeAssessment.id}`}
                                className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-800"
                              >
                                <Upload className="h-4 w-4" />
                                Upload to this request
                              </Link>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeAssessment && activeTab !== 'dashboard' && activeTab !== 'requested-documents' && (
              <Suspense fallback={<DashboardTabPanelSkeleton message={`Loading ${activeTab}...`} />}>
                <PlaintiffDashboardDeferredTabPanel
                  activeTab={activeTab}
                  activeAssessmentId={activeAssessment.id}
                  caseScore={caseScore}
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
                  caseMessages={routingStatus?.caseMessages ?? []}
                  attorneyName={routingStatus?.attorneyMatched?.name}
                />
              </Suspense>
            )}
          </>
        ) : (
          <div className="space-y-6">
            {/* Already submitted? Link your case - prominent for users like Joe */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-amber-900 mb-2">Already submitted a case?</h3>
              <p className="text-sm text-amber-800 mb-4">If you completed an assessment before creating your account, link it here to see it on your dashboard.</p>
              <LinkCaseForm onLinked={loadDashboardData} />
            </div>

            {/* Start Your Case Assessment */}
            <div className="bg-brand-600 rounded-xl p-6 text-white">
              <h2 className="text-xl font-bold mb-2">Start Your Case Assessment</h2>
              <p className="text-brand-100 mb-4">
                Answer a few questions about your accident to see if you may have a personal injury case.
              </p>
              <p className="text-sm text-brand-200 mb-6">It takes about 60 seconds.</p>
              <Link
                to="/assessment/start"
                className="inline-flex items-center px-6 py-3 text-base font-semibold bg-white text-brand-600 rounded-lg hover:bg-brand-50"
              >
                <FileText className="h-5 w-5 mr-2" />
                Start Free Case Assessment
              </Link>
              <p className="text-xs text-brand-200 mt-3">Takes about 60 seconds</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* What You'll Get */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">What You'll Get</h3>
                <p className="text-sm text-gray-600 mb-4">Your Case Intelligence Report includes:</p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> Case strength score</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> Estimated case value</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> Probability of success</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> Typical timeline</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> Attorney matching</li>
                </ul>
              </div>

              {/* Your Case Journey */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Your Case Journey</h3>
                <ol className="space-y-3 text-sm text-gray-700">
                  {['Accident details', 'Injury & treatment', 'Evidence upload', 'Case analysis', 'Attorney review', 'Resolution'].map((step, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium flex-shrink-0">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Recent Activity + Upload + Help row */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Recent Activity */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> Account created</li>
                  <li className="text-gray-400">Case assessment started</li>
                  <li className="text-gray-400">Evidence uploaded</li>
                  <li className="text-gray-400">Attorney review submitted</li>
                </ul>
                <p className="text-xs text-gray-400 mt-3">Complete your first assessment to unlock more.</p>
              </div>

              {/* Evidence Upload Shortcut */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Upload Evidence</h3>
                <p className="text-sm text-gray-600 mb-4">Add photos, medical bills, or police reports. This can strengthen your case analysis.</p>
                <Link
                  to="/assessment/start"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Link>
              </div>

              {/* Help / Guidance */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Need help getting started?</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Most people complete the case assessment in about 60 seconds.</li>
                  <li>• Your answers are secure and confidential.</li>
                  <li>• No obligation — you decide whether to speak with an attorney.</li>
                </ul>
              </div>
            </div>

            {/* My Cases */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">My Cases</h3>
              <p className="text-sm text-gray-500">No cases yet.</p>
              <p className="text-xs text-gray-400 mt-2">Start your first assessment to create a case.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
