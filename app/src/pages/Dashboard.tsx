import { Suspense, lazy, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { listAssessments, getAssessment, getEvidenceFiles, associateAssessments, getRoutingStatus, createAppointment, getAttorneyAvailability, updateAppointment, cancelAppointment, joinAppointmentWaitlist, updateAppointmentPreparation, sendMessage, getOrCreateChatRoom, getPlaintiffConsentCompliance, requestEmailVerification, getPlaintiffDocumentRequests, createAttorneyReview, type PlaintiffDocumentRequest } from '../lib/api'
import { formatCurrency } from '../lib/formatters'
import { CheckCircle, Square, Upload, FileText, TrendingUp, MessageCircle, BarChart3, FileStack, Activity, LayoutDashboard, ChevronRight, Bell, HelpCircle, Clock, Users, Calendar, Phone, ExternalLink, Send, Star } from 'lucide-react'
import CaseProgressPipeline from '../components/CaseProgressPipeline'
import { DashboardPageSkeleton, DashboardTabPanelSkeleton } from '../components/PageSkeletons'
import { clearStoredAuth, getLoginRedirect } from '../lib/auth'
import { loadPlaintiffSessionSummary, updateCachedPlaintiffAssessments } from '../hooks/usePlaintiffSessionSummary'

type TabId = 'dashboard' | 'tasks' | 'documents' | 'attorney' | 'value' | 'journal'

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
      await associateAssessments([id])
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
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [painLevel, setPainLevel] = useState(5)
  const [painNote, setPainNote] = useState('')
  const [journalSaved, setJournalSaved] = useState(false)
  const [journalEntries, setJournalEntries] = useState<{ date: string; level: number; note: string }[]>([])
  const [editingEntryIndex, setEditingEntryIndex] = useState<number | null>(null)
  const [wageDays, setWageDays] = useState('')
  const [wageDaily, setWageDaily] = useState('')
  const [routingStatus, setRoutingStatus] = useState<{
    lifecycleState?: string
    statusMessage?: string
    attorneysRouted?: number
    attorneysReviewing?: number
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
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    setPrepNotes(routingStatus?.upcomingAppointment?.preparation?.preparationNotes || '')
  }, [routingStatus?.upcomingAppointment?.id, routingStatus?.upcomingAppointment?.preparation?.preparationNotes])
  const caseIdFromUrl = searchParams.get('case')

  useEffect(() => {
    loadDashboardData()
  }, [])

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
  const treatment = Array.isArray(parsedFacts.treatment) ? parsedFacts.treatment : []
  const damages = parsedFacts.damages || {}
  const hasNarrative = !!parsedFacts.incident?.narrative
  const hasLocation = !!(parsedFacts.incident?.location || parsedFacts.venue?.state)
  const hasWageLoss = !!(damages.wage_loss || parsedFacts?.caseAcceleration?.wageLoss || evidenceFiles.some(f => f.category === 'wage_loss'))
  const submittedForReview = !!activeAssessment?.submittedForReview
  const attorneyReviewCount = (routingStatus?.attorneysReviewing && routingStatus.attorneysReviewing > 0) ? routingStatus.attorneysReviewing : 3

  const hasInjuryPhotos = evidenceFiles.some((f: any) => f?.category === 'photos')
  const hasMedicalRecords = evidenceFiles.some((f: any) => f?.category === 'medical_records' || f?.category === 'bills')
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
        subtitle: plaintiffRoutingStatusMessage || 'Expected response within 24 hours',
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
    ? { action: 'Your case has been submitted for attorney review', valueIncrease: 'Attorneys typically respond within 24 hours', cta: 'View Case Report', href: activeAssessment ? `/results/${activeAssessment.id}` : '/assessment/start', isSchedule: false }
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

  const pendingItems = checklist.filter(c => !c.done)
  const actionItemsCount = pendingItems.length
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
    const key = `pain_journal_${activeAssessment.id}`
    let updated: { date: string; level: number; note: string }[]
    if (editingEntryIndex !== null) {
      updated = journalEntries.map((e, i) =>
        i === editingEntryIndex ? { ...e, level: painLevel, note: painNote } : e
      )
      setEditingEntryIndex(null)
    } else {
      const newEntry = { date: new Date().toISOString(), level: painLevel, note: painNote }
      updated = [...journalEntries, newEntry].slice(-30)
    }
    localStorage.setItem(key, JSON.stringify(updated))
    setJournalEntries(updated)
    setPainNote('')
    setJournalSaved(true)
    setTimeout(() => setJournalSaved(false), 2500)
  }

  const handleEditEntry = (index: number) => {
    const entry = journalEntries[index]
    setPainLevel(entry.level)
    setPainNote(entry.note)
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
  }

  if (isLoading) {
    return <DashboardPageSkeleton />
  }

  if (!user) return null

  return (
    <div className="min-h-screen transition-colors">
      {user.emailVerified === false && (
        <div className="page-shell pb-0 pt-4 print:hidden">
          <div className="subtle-panel flex flex-col gap-2 px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Email verification is pending. Some secure actions may require verification later.
            </p>
            <button
              type="button"
              className="btn-ghost shrink-0 text-xs"
              onClick={() =>
                requestEmailVerification().catch(() =>
                  window.alert('Verification email is not configured on the server yet.')
                )
              }
            >
              Request verification link
            </button>
          </div>
        </div>
      )}
      {/* Schedule Consultation Modal */}
      {scheduleModalOpen && routingStatus?.attorneyMatched && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="surface-panel w-full max-w-md p-6 shadow-xl">
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
                {activeAssessment
                  ? `Your case is ${docPercent}% complete.${actionItemsCount > 0 ? ' Two more documents could significantly increase your case value.' : ''}`
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
              {TABS.map((tab) => (
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
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {activeAssessment ? (
          <>
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                <CaseProgressPipeline
                  submittedForReview={submittedForReview}
                  attorneyMatched={attorneyMatched}
                  hasScheduledConsult={hasUpcomingConsult}
                  lifecycleState={routingLifecycle}
                  statusMessage={plaintiffRoutingStatusMessage}
                />
                {/* Top status banner - changes when attorney accepts */}
                {waitingBanner && (
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
                                  const labels: Record<string, string> = { auto: 'Auto accidents', slip_and_fall: 'Slip and fall', medmal: 'Medical malpractice' }
                                  return `Specializes in ${arr.map((x: string) => labels[x] || x).join(', ') || 'personal injury'}`
                                }
                              } catch {}
                              return `Specializes in ${s}`
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
                          <Link
                            to={`/attorneys-enhanced`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Browse Attorneys
                          </Link>
                        </div>
                      </div>
                    </div>

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
                    {/* Primary status + next action */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        {submittedForReview ? (
                          <>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Current status</p>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">
                              {inManualReview
                                ? 'Your case is in team review'
                                : needsMoreInfo
                                ? 'More information is needed'
                                : notRoutableYet
                                ? 'Your case needs more detail'
                                : 'Your case is with attorneys'}
                            </h2>
                            <p className="text-sm text-gray-600 mb-4">
                              {inManualReview
                                ? 'Our team is checking routing fit and the next best step.'
                                : needsMoreInfo
                                ? 'Add the requested details or documents so attorneys can continue reviewing.'
                                : notRoutableYet
                                ? 'More evidence or clearer facts can help us route your case.'
                                : 'Attorneys are reviewing your summary. You decide whether to speak with or hire anyone.'}
                            </p>
                            <div className={`mb-4 rounded-lg border px-3 py-3 text-sm ${
                                inManualReview
                                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                                  : needsMoreInfo
                                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                                  : notRoutableYet
                                  ? 'border-slate-200 bg-slate-50 text-slate-700'
                                  : 'border-brand-200 bg-brand-50 text-brand-700'
                              }`}>
                              {plaintiffRoutingStatusMessage || (inManualReview
                                ? 'You do not need to do anything urgent unless we request more information.'
                                : 'Most attorneys respond within about 24 hours.')}
                            </div>
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center gap-2 text-green-700">
                                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                                <span>Submitted for attorney review</span>
                              </div>
                              {!waitingState && (
                                <div className="flex items-center gap-2 text-green-700">
                                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                                  <span>{attorneyReviewCount} attorney{attorneyReviewCount !== 1 ? 's' : ''} reviewing your case</span>
                                </div>
                              )}
                              {waitingState && (
                                <div className="flex items-center gap-2 text-gray-700">
                                  <Clock className="h-5 w-5 flex-shrink-0" />
                                  <span>
                                    {inManualReview
                                      ? 'Team review in progress'
                                      : needsMoreInfo
                                      ? 'Waiting for added information'
                                      : 'Case is not routable yet'}
                                  </span>
                                </div>
                              )}
                              {(() => {
                                const lastView = (routingStatus?.attorneyActivity ?? []).find((a: Record<string, string>) => a.type === 'viewed')
                                const timeAgo = lastView?.timeAgo || '10 minutes ago'
                                return <p className="text-sm text-brand-600">Last attorney view: {timeAgo}</p>
                              })()}
                            </div>
                            <p className="text-sm text-gray-500">Typical response time: about 24 hours.</p>
                          </>
                        ) : (
                          <>
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Case Status</h2>
                            <p className="text-base font-medium text-green-700 mb-4">
                              {caseScore >= 25 ? 'Your case appears eligible for attorney review.' : 'Your case may be worth pursuing. Adding evidence could strengthen your assessment.'}
                            </p>
                            <p className="text-sm text-gray-600 mb-4">Cases like yours typically settle between {formatCurrency(settlementLow)} – {formatCurrency(settlementHigh)} in {venueState}.</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-brand-50 rounded-lg border border-brand-100">
                                <p className="text-xs font-semibold text-brand-600">Case Score</p>
                                <p className="text-xl font-bold text-brand-600">{caseScore}/100</p>
                              </div>
                              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-xs font-semibold text-gray-500">Est. Value</p>
                                <p className="text-sm font-bold text-gray-900">{formatCurrency(settlementLow)} – {formatCurrency(settlementHigh)}</p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="bg-brand-600 rounded-xl p-5 min-h-[260px] flex flex-col">
                        <h2 className="text-lg font-bold mb-2">Next Best Action</h2>
                        <p className="text-lg text-brand-100 mb-1">{dailyAction.action}</p>
                        <p className="text-sm text-brand-200 mb-3">{dailyAction.valueIncrease}</p>
                        {(dailyAction.action.toLowerCase().includes('bill') || dailyAction.action.toLowerCase().includes('medical') || dailyAction.action.toLowerCase().includes('urgent')) && (
                          <p className="text-sm text-brand-200/90 mb-4">Medical bills strengthen damages claims and increase settlement value.</p>
                        )}
                        <Link to={dailyAction.href} className="inline-flex items-center px-5 py-2.5 text-sm font-semibold bg-white text-brand-600 rounded-lg hover:bg-brand-50 mt-auto w-fit">
                          {submittedForReview ? <LayoutDashboard className="h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                          {dailyAction.cta}
                        </Link>
                      </div>
                    </div>
                    {!submittedForReview && (
                      <div className="bg-white rounded-xl border-2 border-brand-200 p-5">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Submit Your Case for Attorney Review</h3>
                        <p className="text-sm text-gray-600 mb-2">65% of cases like yours are accepted by attorneys in our network.</p>
                        <p className="text-sm text-gray-600 mb-4">Most attorneys respond within 24 hours.</p>
                        <Link to={`/results/${activeAssessment.id}?review=1`} className="block w-full text-center py-3 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700">
                          Send My Case for Attorney Review
                        </Link>
                      </div>
                    )}

                    {submittedForReview && routingTimelineItems.length > 0 && (
                      <details className="bg-white rounded-xl border border-gray-200 p-5">
                        <summary className="cursor-pointer list-none">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h3 className="text-base font-bold text-gray-900">Detailed routing timeline</h3>
                              <p className="text-sm text-gray-600">Open for recent routing milestones.</p>
                            </div>
                            <Activity className="h-5 w-5 text-brand-600" />
                          </div>
                        </summary>
                        <div className="space-y-3 mt-4">
                          {routingTimelineItems.map((item, index) => (
                            <div key={`${item.title}-${index}`} className={`rounded-lg border px-4 py-3 ${item.tone}`}>
                              <p className="text-sm font-semibold">{item.title}</p>
                              <p className="text-xs mt-1 opacity-90">{item.detail}</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </>
                )}

                {/* 2-column grid - Evidence, Progress, Value (Evidence moved below when attorney matched) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Row 1: Upload Evidence | Case Progress */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5 min-h-[280px] flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                      {attorneyMatched ? 'Upload Evidence' : submittedForReview ? 'Evidence that can help while you wait' : 'Evidence Center'}
                    </h3>
                    {submittedForReview && (
                      <p className="text-sm text-gray-600 mb-3">Medical records, photos, and reports can help attorneys understand the case faster.</p>
                    )}
                    <p className="text-sm font-medium text-gray-700 mb-2">Evidence Score: <span className="font-bold text-brand-600">{evidencePercent}%</span></p>
                    <div className="h-2 bg-gray-200 rounded-full mb-3 overflow-hidden">
                      <div className="h-full bg-brand-600 rounded-full transition-all" style={{ width: `${evidencePercent}%` }} />
                    </div>
                    <div className="space-y-3">
                      {evidenceChecklist.map((e) => (
                        <div key={e.label} className="flex items-center gap-2 text-sm">
                          {e.done ? <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" /> : <Square className="h-4 w-4 text-gray-300 flex-shrink-0" />}
                          <span className={e.done ? 'text-gray-700' : 'text-gray-500'}>{e.label}</span>
                        </div>
                      ))}
                    </div>
                    <Link to={`/evidence-upload/${activeAssessment.id}`} className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 w-fit">
                      <Upload className="h-4 w-4" />
                      Upload Evidence
                    </Link>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5 min-h-[280px] flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Next few steps</h3>
                    <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                      <p className="text-sm font-semibold text-gray-900 mb-2">What happens next</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>Today → {attorneyMatched ? 'Working with attorney' : inManualReview ? 'Team review' : needsMoreInfo ? 'Waiting for more info' : notRoutableYet ? 'Strengthening case details' : submittedForReview ? 'Attorneys reviewing your case' : 'Case submitted'}</li>
                        <li>1–2 days → {attorneyMatched && hasUpcomingConsult ? 'Your consultation' : 'Attorney consultation'}</li>
                        <li>1–3 months → Negotiation</li>
                        <li>6–12 months → Settlement</li>
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

                  {/* Row 2: Case Value History | Case Health */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5 min-h-[280px] flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-brand-600" />
                      Case Value History
                    </h3>
                    <div className="flex items-end gap-2 mb-3">
                      {caseValueHistory.map((entry, i) => {
                        const barHeight = maxValue > 0 ? Math.max(16, Math.round((entry.value / maxValue) * 64)) : 16
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                            <div className="w-full flex flex-col justify-end" style={{ height: 64 }}>
                              <div className="w-full bg-brand-500 rounded-t transition-all" style={{ height: barHeight }} />
                            </div>
                            <span className="text-xs text-gray-500" title={entry.label}>{entry.shortLabel}</span>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-sm text-gray-600 mt-auto">Current: <span className="font-semibold text-brand-600">{formatCurrency(settlementHigh)}</span></p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5 min-h-[280px] flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Case Health: {caseScore}%</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-500">Liability</p>
                        <p className={`font-semibold text-sm ${liabilityLabel === 'Strong' ? 'text-green-600' : liabilityLabel === 'Moderate' ? 'text-amber-600' : 'text-red-600'}`}>{liabilityLabel}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-500">Evidence</p>
                        <p className={`font-semibold text-sm ${evidencePercent >= 75 ? 'text-green-600' : evidencePercent >= 25 ? 'text-amber-600' : 'text-red-600'}`}>{evidencePercent >= 75 ? 'Complete' : evidencePercent >= 25 ? 'Incomplete' : 'Missing'}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-500">Medical</p>
                        <p className={`font-semibold text-sm ${treatment.length > 0 ? 'text-green-600' : 'text-amber-600'}`}>{treatment.length > 0 ? 'Good' : 'Missing'}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-500">Damages</p>
                        <p className={`font-semibold text-sm ${damagesLabel === 'Documented' ? 'text-green-600' : 'text-amber-600'}`}>{damagesLabel === 'Documented' ? 'Documented' : 'Missing'}</p>
                      </div>
                    </div>
                    {scoreFactors.some(f => f.improve) && (
                      <p className="text-sm text-brand-600 font-medium mt-3">{scoreFactors.find(f => f.improve)?.improve}</p>
                    )}
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
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Cases like yours in {venueState}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-brand-50 rounded-lg">
                        <p className="text-xs font-medium text-brand-600">Typical settlement</p>
                        <p className="text-lg font-bold text-brand-900">{formatCurrency(settlementMedian)}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-500">Range</p>
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(settlementLow)} – {formatCurrency(settlementHigh)}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                        <p className="text-xs font-medium text-gray-500">Typical timeline</p>
                        <p className="text-sm font-semibold text-gray-900">8 months</p>
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

            {activeAssessment && activeTab !== 'dashboard' && (
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
                  treatment={treatment}
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
                  evidenceImpact={evidenceImpact}
                  recentActivity={recentActivity}
                  notification={notification}
                  wageDays={wageDays}
                  onWageDaysChange={setWageDays}
                  wageDaily={wageDaily}
                  onWageDailyChange={setWageDaily}
                  wageLossEstimate={wageLossEstimate}
                  painLevel={painLevel}
                  onPainLevelChange={setPainLevel}
                  painNote={painNote}
                  onPainNoteChange={setPainNote}
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
