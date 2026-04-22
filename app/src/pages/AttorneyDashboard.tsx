import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  AlertTriangle,
  ChevronRight,
  Phone,
  MessageSquare,
  Calendar,
  Filter,
  Target,
  User,
  Upload,
  ClipboardList,
  FileText,
  StickyNote,
  Clock,
  UserPlus,
  Receipt
} from 'lucide-react'
import { getAttorneyDashboard, decideLead, updateLeadStatus, createDocumentRequest, scheduleConsultation, getCaseContacts, createLeadSolTask, getAttorneyRoiAnalytics, downloadLeadCaseFile, createCaseFromLead, createManualIntake, saveLeadDecisionOverride, getAnalyticsIntelligence, transferLeadToFirmAttorney, getLeadCommandCenter, askLeadCommandCenterCopilot, syncLeadReadinessAutomation, updateLeadReminder, getAttorneyCalendarHealth, getAttorneyCalendarConnectUrl, syncAttorneyCalendar, disconnectAttorneyCalendar, type AttorneyCalendarConnection, type CaseCommandCenter } from '../lib/api'
import Tooltip from '../components/Tooltip'
import { AttorneyDashboardPanelSkeleton, AttorneyDashboardSkeleton } from '../components/PageSkeletons'
import { clearStoredAuth, getLoginRedirect, hasValidAuthToken } from '../lib/auth'
import { useAttorneyCommunications } from '../hooks/useAttorneyCommunications'
import { useAttorneyCaseActivity } from '../hooks/useAttorneyCaseActivity'
import { useAttorneyCaseHealth } from '../hooks/useAttorneyCaseHealth'
import { useAttorneyCaseInsights } from '../hooks/useAttorneyCaseInsights'
import { useAttorneyCommentThreads } from '../hooks/useAttorneyCommentThreads'
import { useAttorneyDecisionSupport } from '../hooks/useAttorneyDecisionSupport'
import { useAttorneyFinanceCollaboration } from '../hooks/useAttorneyFinanceCollaboration'
import { useAttorneyProfileLicense } from '../hooks/useAttorneyProfileLicense'
import { useAttorneyTaskWorkflow } from '../hooks/useAttorneyTaskWorkflow'
import { invalidateAttorneyDashboardSummary } from '../hooks/useAttorneyDashboardSummary'
import { invalidateFirmDashboardSummary, loadFirmDashboardSummary } from '../hooks/useFirmDashboardSummary'

const loadAttorneyDashboardAnalyticsTab = () => import('../components/AttorneyDashboardAnalyticsTab')
const loadAttorneyDashboardDeferredInlineWorkstream = () => import('../components/AttorneyDashboardDeferredInlineWorkstream')
const loadAttorneyDashboardLeadDetail = () => import('../components/AttorneyDashboardLeadDetail')
const loadAttorneyDashboardLeadsTab = () => import('../components/AttorneyDashboardLeadsTab')
const loadAttorneyDashboardProfileTab = () => import('../components/AttorneyDashboardProfileTab')
const loadAttorneyDashboardIntakeTab = () => import('../components/AttorneyDashboardIntakeTab')
const loadAttorneyDashboardWorkstreamBilling = () => import('../components/AttorneyDashboardWorkstreamBilling')
const loadAttorneyDashboardWorkstreamCaseInsights = () => import('../components/AttorneyDashboardWorkstreamCaseInsights')
const loadAttorneyDashboardWorkstreamCollaboration = () => import('../components/AttorneyDashboardWorkstreamCollaboration')
const loadAttorneyDashboardWorkstreamDemand = () => import('../components/AttorneyDashboardWorkstreamDemand')
const loadAttorneyDashboardWorkstreamEvidence = () => import('../components/AttorneyDashboardWorkstreamEvidence')
const loadAttorneyDashboardWorkstreamHealth = () => import('../components/AttorneyDashboardWorkstreamHealth')
const loadAttorneyDashboardWorkstreamInsurance = () => import('../components/AttorneyDashboardWorkstreamInsurance')
const loadAttorneyDashboardWorkstreamNegotiation = () => import('../components/AttorneyDashboardWorkstreamNegotiation')
const loadAttorneyDashboardWorkstreamOverview = () => import('../components/AttorneyDashboardWorkstreamOverview')
const loadAttorneyDashboardWorkstreamTasks = () => import('../components/AttorneyDashboardWorkstreamTasks')

const postAcceptanceWorkstreamPrefetchers: Record<string, Array<() => Promise<unknown>>> = {
  overview: [
    loadAttorneyDashboardWorkstreamEvidence,
    loadAttorneyDashboardWorkstreamCaseInsights,
    loadAttorneyDashboardWorkstreamTasks,
  ],
  negotiation: [
    loadAttorneyDashboardWorkstreamBilling,
    loadAttorneyDashboardWorkstreamCollaboration,
  ],
  collaboration: [
    loadAttorneyDashboardWorkstreamTasks,
    loadAttorneyDashboardWorkstreamDemand,
  ],
  tasks: [
    loadAttorneyDashboardWorkstreamDemand,
    loadAttorneyDashboardWorkstreamBilling,
  ],
  evidence: [
    loadAttorneyDashboardWorkstreamOverview,
    loadAttorneyDashboardWorkstreamCaseInsights,
  ],
  'case-insights': [
    loadAttorneyDashboardWorkstreamEvidence,
    loadAttorneyDashboardWorkstreamDemand,
  ],
  demand: [
    loadAttorneyDashboardWorkstreamCaseInsights,
    loadAttorneyDashboardWorkstreamNegotiation,
  ],
  billing: [
    loadAttorneyDashboardWorkstreamNegotiation,
    loadAttorneyDashboardWorkstreamInsurance,
  ],
  insurance: [
    loadAttorneyDashboardWorkstreamHealth,
    loadAttorneyDashboardWorkstreamBilling,
  ],
  health: [
    loadAttorneyDashboardWorkstreamOverview,
    loadAttorneyDashboardWorkstreamTasks,
  ],
}

function scheduleIdlePrefetch(task: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void) => number
    cancelIdleCallback?: (handle: number) => void
  }

  if (typeof idleWindow.requestIdleCallback === 'function') {
    const handle = idleWindow.requestIdleCallback(() => task())
    return () => {
      if (typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(handle)
      }
    }
  }

  const timeoutId = window.setTimeout(task, 250)
  return () => window.clearTimeout(timeoutId)
}

const ChatDrawer = lazy(() => import('../components/ChatDrawer'))
const DeclineModal = lazy(() => import('../components/DeclineModal'))
const AttorneyDashboardAnalyticsTab = lazy(loadAttorneyDashboardAnalyticsTab)
const AttorneyDashboardDeferredInlineWorkstream = lazy(loadAttorneyDashboardDeferredInlineWorkstream)
const AttorneyDashboardLeadDetail = lazy(loadAttorneyDashboardLeadDetail)
const AttorneyDashboardLeadsTab = lazy(loadAttorneyDashboardLeadsTab)
const AttorneyDashboardProfileTab = lazy(loadAttorneyDashboardProfileTab)
const AttorneyDashboardIntakeTab = lazy(loadAttorneyDashboardIntakeTab)
const AttorneyDashboardWorkstreamBilling = lazy(loadAttorneyDashboardWorkstreamBilling)
const AttorneyDashboardWorkstreamCaseInsights = lazy(loadAttorneyDashboardWorkstreamCaseInsights)
const AttorneyDashboardWorkstreamCollaboration = lazy(loadAttorneyDashboardWorkstreamCollaboration)
const AttorneyDashboardWorkstreamDemand = lazy(loadAttorneyDashboardWorkstreamDemand)
const AttorneyDashboardWorkstreamEvidence = lazy(loadAttorneyDashboardWorkstreamEvidence)
const AttorneyDashboardWorkstreamHealth = lazy(loadAttorneyDashboardWorkstreamHealth)
const AttorneyDashboardWorkstreamInsurance = lazy(loadAttorneyDashboardWorkstreamInsurance)
const AttorneyDashboardWorkstreamNegotiation = lazy(loadAttorneyDashboardWorkstreamNegotiation)
const AttorneyDashboardWorkstreamOverview = lazy(loadAttorneyDashboardWorkstreamOverview)
const AttorneyDashboardWorkstreamTasks = lazy(loadAttorneyDashboardWorkstreamTasks)
const DocumentRequestModal = lazy(() => import('../components/DocumentRequestModal'))
const LeadPickerModal = lazy(() => import('../components/LeadPickerModal'))
const ScheduleConsultModal = lazy(() => import('../components/ScheduleConsultModal'))

type CaseStageCounts = {
  matched: number
  accepted: number
  contacted: number
  consultScheduled: number
  retained: number
  closed: number
  consulted?: number
}

type PipelineAlertSummary = {
  newMatchesExpiringSoon?: number
  underReviewNeedsFollowUp?: number
  matchedExpiringSoon?: number
  acceptedNeedsFollowUp?: number
  consultToday?: number
}

interface DashboardData {
  dashboard: any
  recentLeads: Lead[]
  qualityMetrics: any
  urgentLeads: Lead[]
  analytics: any
  activeCases?: CaseStageCounts
  funnel?: CaseStageCounts
  newCaseMatches?: Lead[]
  topCaseToday?: any
  roiAnalytics?: any
  pipelineValue?: number
  retainedValue?: number
  pipelineAlerts?: PipelineAlertSummary
  casesRequiringAttention?: number
  upcomingConsults?: Array<{ id: string; scheduledAt: string; type: string; duration: number; plaintiffName: string; claimType: string }>
  pipelinePreviews?: {
    matched: Array<{ id: string; claimType?: string; venue?: string; estimatedValue?: number; viability?: number }>
    accepted: Array<{ id: string; claimType?: string; venue?: string; estimatedValue?: number; viability?: number }>
    contacted: Array<{ id: string; claimType?: string; venue?: string; estimatedValue?: number; viability?: number }>
    consultScheduled: Array<{ id: string; claimType?: string; venue?: string }>
    retained: Array<{ id: string; claimType?: string; estimatedValue?: number }>
  }
  messagingSummary?: { unreadCount: number; awaitingResponseCount: number }
  pipelineMessageCounts?: Record<string, number>
  recentContacts?: Array<{ id: string; leadId: string; contactType: string; contactMethod?: string; completedAt?: string; plaintiffName: string; claimType: string }>
  caseContactsCount?: number
  quickActionCounts?: {
    tasks?: number
    timeEntries?: number
    documents?: number
    notes?: number
    invoices?: number
    expenses?: number
    documentRequests?: number
    events?: number
  }
  needsActionToday?: Array<{
    id: string
    leadId: string
    assessmentId: string
    plaintiffName: string
    claimType: string
    title: string
    detail: string
    severity: 'high' | 'medium' | 'low'
    dueAt?: string
    actionType: string
    actionLabel: string
    targetSection?: string
    requestedDocs?: string[]
    customMessage?: string
    messageDraft?: string
    readinessScore: number
  }>
  dailyQueueSummary?: {
    total: number
    highSeverity: number
    mediumSeverity: number
    demandReady: number
  }
  automationFeed?: Array<{
    id: string
    leadId: string
    assessmentId: string
    plaintiffName: string
    claimType: string
    category: string
    title: string
    detail: string
    severity: 'high' | 'medium' | 'low'
    actionLabel: string
    targetSection?: string
    dueAt: string
    createdAt: string
    updatedAt: string
    status: string
    activityTrail: Array<{ label: string; at: string }>
  }>
}

interface Lead {
  id: string
  viabilityScore: number
  liabilityScore: number
  causationScore: number
  damagesScore: number
  isExclusive: boolean
  sourceType: string
  hotnessLevel: string
  submittedAt: string
  status: string
  assignedAttorneyId?: string | null
  assessment: any
  contactAttempts: any[]
  conflictChecks: any[]
  qualityReports: any[]
  demandReadiness?: {
    score: number
    label: string
    blockerCount: number
    blockers: Array<{ key: string; title: string; detail: string; severity: 'high' | 'medium' | 'low' }>
    nextAction: {
      actionType: string
      title: string
      detail: string
      targetSection?: string
      requestedDocs?: string[]
      customMessage?: string
      messageDraft?: string
    }
    overdueTaskCount: number
    dueTodayTaskCount: number
    isDemandReady: boolean
  }
}

const DEFAULT_CASE_LEADS_FILTER = {
  caseType: '',
  valueRange: '',
  status: '',
  pipelineStage: '',
  evidenceLevel: '',
  jurisdiction: '',
}

const ATTORNEY_DASHBOARD_TABS = ['overview', 'leads', 'analytics', 'intake', 'profile'] as const

export default function AttorneyDashboard() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { leadId: leadIdParam, section: leadSectionParam } = useParams()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const isPostAcceptance = selectedLead
    ? ['contacted', 'consulted', 'retained'].includes(selectedLead.status)
    : false
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<(typeof ATTORNEY_DASHBOARD_TABS)[number]>(() => {
    const requestedTab = searchParams.get('tab')
    return ATTORNEY_DASHBOARD_TABS.includes(requestedTab as (typeof ATTORNEY_DASHBOARD_TABS)[number])
      ? (requestedTab as (typeof ATTORNEY_DASHBOARD_TABS)[number])
      : 'overview'
  })
  const [automationFeedFilter, setAutomationFeedFilter] = useState<'all' | 'high' | 'resolved' | 'due_today'>(() => {
    try {
      const stored = localStorage.getItem('clearcaseiq_automation_feed_filter')
      return stored === 'high' || stored === 'resolved' || stored === 'due_today' ? stored : 'all'
    } catch {
      return 'all'
    }
  })
  const [automationFeedSort, setAutomationFeedSort] = useState<'due_asc' | 'recent' | 'severity'>(() => {
    try {
      const stored = localStorage.getItem('clearcaseiq_automation_feed_sort')
      return stored === 'recent' || stored === 'severity' ? stored : 'due_asc'
    } catch {
      return 'due_asc'
    }
  })
  const {
    editing,
    handleLicenseFileChange,
    handleLicenseFileUpload,
    handleSaveProfile,
    handleStateBarLookup,
    licenseError,
    licenseLoading,
    licenseMethod,
    licenseNumber,
    licenseState,
    licenseStatus,
    licenseSuccess,
    profile,
    profileLoading,
    selectedLicenseFile,
    setEditing,
    setLicenseError,
    setLicenseMethod,
    setLicenseNumber,
    setLicenseState,
    setProfile,
  } = useAttorneyProfileLicense(setError)
  const [leadDecisionLoading, setLeadDecisionLoading] = useState(false)
  const [decisionRationale, setDecisionRationale] = useState('')
  const [declineModalOpen, setDeclineModalOpen] = useState(false)
  const [declineSuccess, setDeclineSuccess] = useState(false)
  const [declineLeadId, setDeclineLeadId] = useState<string | null>(null)
  const [analyticsIntel, setAnalyticsIntel] = useState<any>(null)
  const [caseFileLoading, setCaseFileLoading] = useState(false)
  const {
    casePreparation,
    handleAddInsurance,
    handleAddLien,
    insuranceForm,
    insuranceItems,
    leadEvidenceFiles,
    lienForm,
    lienItems,
    medicalChronology,
    setInsuranceForm,
    setLienForm,
    settlementBenchmarks,
  } = useAttorneyCaseInsights(selectedLead?.id, isPostAcceptance)
  const [firmAttorneys, setFirmAttorneys] = useState<Array<{ id: string; name: string; email: string | null }>>([])
  const [transferAttorneyId, setTransferAttorneyId] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferMessage, setTransferMessage] = useState<string | null>(null)
  const {
    caseShareForm,
    caseShareMessage,
    caseShares,
    coCounselForm,
    coCounselMessage,
    coCounselWorkflows,
    financeLoading,
    financeMessage,
    financeModel,
    financeSummary,
    handleAcceptCaseShare,
    handleAcceptCoCounsel,
    handleAcceptReferral,
    handleCreateCaseShare,
    handleCreateCoCounselWorkflow,
    handleCreateReferral,
    handleDeclineCaseShare,
    handleDeclineCoCounsel,
    handleDeclineReferral,
    handleDownloadFinanceDataroom,
    handleDownloadFinanceUnderwritingPdf,
    referralForm,
    referralMessage,
    referrals,
    setCaseShareForm,
    setCoCounselForm,
    setFinanceModel,
    setReferralForm,
  } = useAttorneyFinanceCollaboration(selectedLead?.id)
  const {
    cadenceStepForm,
    cadenceSteps,
    cadenceTemplateForm,
    caseHealth,
    handleAddCadenceStep,
    handleAddHealthRule,
    handleAddRecurringInvoice,
    handleCreateCadenceTemplate,
    handleDeleteCadenceTemplate,
    handleDeleteHealthRule,
    handleProcessRecurringInvoices,
    handleRefreshHealth,
    healthRuleForm,
    healthRules,
    negotiationCadenceTemplates,
    recurringInvoiceForm,
    recurringInvoices,
    setCadenceStepForm,
    setCadenceTemplateForm,
    setHealthRuleForm,
    setRecurringInvoiceForm,
  } = useAttorneyCaseHealth(selectedLead?.id)
  const {
    commentLoading,
    commentMessage,
    commentThreads,
    handleAddComment,
    handleCreateCommentThread,
    handleSelectCommentThread,
    selectedThreadId,
    setCommentMessage,
    setThreadForm,
    threadComments,
    threadForm,
  } = useAttorneyCommentThreads(selectedLead?.id)
  const {
    handleAddInvoice,
    handleAddNegotiation,
    handleAddNote,
    handleAddPayment,
    handleDownloadInvoiceDocx,
    handleDownloadInvoicePdf,
    handleDownloadPaymentReceipt,
    handleUpdateNegotiationStatus,
    invoiceForm,
    invoiceItems,
    negotiationForm,
    negotiationItems,
    noteForm,
    noteItems,
    paymentForm,
    paymentItems,
    setInvoiceForm,
    setNegotiationForm,
    setNoteForm,
    setPaymentForm,
  } = useAttorneyCaseActivity(selectedLead?.id)
  const {
    handleAddTask,
    handleAddWorkflowStep,
    handleApplyWorkflowTemplate,
    handleCreateTasksFromReadiness,
    handleCreateWorkflowTemplate,
    handleDeleteWorkflowTemplate,
    handleToggleTask,
    setTaskForm,
    setTaskItems,
    setWorkflowBaseDate,
    setWorkflowStepForm,
    setWorkflowTemplateForm,
    taskForm,
    taskItems,
    workflowBaseDate,
    workflowMessage,
    workflowStepForm,
    workflowSteps,
    workflowTemplateForm,
    workflowTemplates,
  } = useAttorneyTaskWorkflow(selectedLead?.id)

  const leadSection = leadSectionParam ? leadSectionParam.toLowerCase() : ''
  const isLeadSection = Boolean(leadIdParam && leadSection)
  const [workstreamTab, setWorkstreamTab] = useState('overview')
  const goToSection = (section: string) => {
    if (isLeadSection && leadIdParam) {
      navigate(`/attorney-dashboard/lead/${leadIdParam}/${section}`)
    } else {
      setWorkstreamTab(section)
    }
  }
  const [leadPhaseTab, setLeadPhaseTab] = useState<'pre' | 'post'>('pre')
  const [negotiationTab, setNegotiationTab] = useState<'tracker' | 'cadence'>('tracker')
  const [insuranceTab, setInsuranceTab] = useState<'insurance' | 'liens'>('insurance')
  const [caseLeadsFilter, setCaseLeadsFilter] = useState(() => ({
    ...DEFAULT_CASE_LEADS_FILTER,
    caseType: searchParams.get('caseType') || '',
    valueRange: searchParams.get('valueRange') || '',
    status: searchParams.get('status') || '',
    pipelineStage: searchParams.get('stage') || '',
    evidenceLevel: searchParams.get('evidence') || '',
    jurisdiction: searchParams.get('jurisdiction') || '',
  }))
  const [starredLeadIds, setStarredLeadIds] = useState<Set<string>>(() => {
    try {
      const s = localStorage.getItem('clearcaseiq_starred_leads')
      return s ? new Set(JSON.parse(s)) : new Set()
    } catch { return new Set() }
  })
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [bulkActionMessage, setBulkActionMessage] = useState<string | null>(null)
  const [calendarConnections, setCalendarConnections] = useState<AttorneyCalendarConnection[]>([])
  const [calendarHealthSummary, setCalendarHealthSummary] = useState<{
    totalConnections: number
    connectedCount: number
    healthyCount: number
    warningCount: number
    errorCount: number
    disconnectedCount: number
  } | null>(null)
  const [calendarConnectionsLoading, setCalendarConnectionsLoading] = useState(false)
  const [calendarActionProvider, setCalendarActionProvider] = useState<string | null>(null)
  const [documentRequestModalOpen, setDocumentRequestModalOpen] = useState(false)
  const [scheduleConsultModalOpen, setScheduleConsultModalOpen] = useState(false)
  const [consultCalendarModalOpen, setConsultCalendarModalOpen] = useState(false)
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false)
  const [documentRequestPrefill, setDocumentRequestPrefill] = useState<{
    requestedDocs: Array<'police_report' | 'medical_records' | 'injury_photos' | 'wage_loss' | 'insurance' | 'other'>
    customMessage?: string
    sendUploadLinkOnly?: boolean
  } | null>(null)
  const [chatDraftPrefill, setChatDraftPrefill] = useState('')
  const [activePipelineTile, setActivePipelineTile] = useState<string | null>(() => searchParams.get('stage') || null)
  const [pendingQuickAction, setPendingQuickAction] = useState<{ action: string; section?: string } | null>(null)
  const [leadPickerOpen, setLeadPickerOpen] = useState(false)
  const [leadPickerAction, setLeadPickerAction] = useState<{ action: string; section?: string } | null>(null)
  const [leadCommandCenter, setLeadCommandCenter] = useState<CaseCommandCenter | null>(null)
  const [leadCommandCenterLoading, setLeadCommandCenterLoading] = useState(false)
  const [copilotAnswer, setCopilotAnswer] = useState<{ answer: string; sources: Array<{ label: string; detail: string }> } | null>(null)
  const [copilotLoading, setCopilotLoading] = useState(false)
  const scrollToCasesFilters = useCallback(() => {
    setTimeout(
      () => document.getElementById('cases-filters')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      100,
    )
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem('clearcaseiq_automation_feed_filter', automationFeedFilter)
    } catch {}
  }, [automationFeedFilter])
  useEffect(() => {
    try {
      localStorage.setItem('clearcaseiq_automation_feed_sort', automationFeedSort)
    } catch {}
  }, [automationFeedSort])
  const handleQuickAction = useCallback((action: string, section?: string) => {
    setLeadPickerAction({ action, section })
    setLeadPickerOpen(true)
  }, [])

  const handleLeadPickerSelect = useCallback((lead: any) => {
    if (!leadPickerAction) return
    const { action, section } = leadPickerAction
    setLeadPickerAction(null)
    setSelectedLead(lead)
    if (action === 'scheduleConsult') {
      navigate(`/attorney-dashboard/schedule-consult/${lead.id}`)
    } else if (action === 'documentRequest') {
      navigate(`/attorney-dashboard/request-docs/${lead.id}`)
    } else if (action === 'documents') {
      navigate(`/attorney-dashboard/documents/${lead.id}`)
    } else if (action === 'addContact') {
      navigate(`/attorney-dashboard/add-contact/${lead.id}`)
    } else if (action === 'timeEntry') {
      navigate(`/attorney-dashboard/time-entry/${lead.id}`)
    } else if (action === 'addTask' || section === 'tasks') {
      navigate(`/attorney-dashboard/add-task/${lead.id}`)
    } else if (action === 'addNote' || section === 'demand') {
      navigate(`/attorney-dashboard/add-note/${lead.id}`)
    } else if (action === 'addExpense' || section === 'insurance') {
      navigate(`/attorney-dashboard/add-expense/${lead.id}`)
    } else if (action === 'createInvoice' || section === 'billing') {
      navigate(`/attorney-dashboard/create-invoice/${lead.id}`)
    } else if (action === 'draftMessage') {
      navigate(`/attorney-dashboard/draft-message/${lead.id}`)
    } else if (section) {
      const isPost = ['contacted', 'consulted', 'retained'].includes(lead.status || '')
      setLeadPhaseTab(isPost ? 'post' : 'pre')
      navigate(`/attorney-dashboard/lead/${lead.id}/${section}`)
    }
  }, [leadPickerAction, navigate])

  const handleQuickActionForLead = useCallback((lead: any, action: string, section?: string) => {
    setSelectedLead(lead)
    setPendingQuickAction(null)
    if (action === 'scheduleConsult') {
      navigate(`/attorney-dashboard/schedule-consult/${lead.id}`)
    } else if (action === 'documentRequest') {
      navigate(`/attorney-dashboard/request-docs/${lead.id}`)
    } else if (action === 'documents') {
      navigate(`/attorney-dashboard/documents/${lead.id}`)
    } else if (action === 'addContact') {
      navigate(`/attorney-dashboard/add-contact/${lead.id}`)
    } else if (action === 'timeEntry') {
      navigate(`/attorney-dashboard/time-entry/${lead.id}`)
    } else if (action === 'addTask' || section === 'tasks') {
      navigate(`/attorney-dashboard/add-task/${lead.id}`)
    } else if (action === 'addNote' || section === 'demand') {
      navigate(`/attorney-dashboard/add-note/${lead.id}`)
    } else if (action === 'addExpense' || section === 'insurance') {
      navigate(`/attorney-dashboard/add-expense/${lead.id}`)
    } else if (action === 'createInvoice' || section === 'billing') {
      navigate(`/attorney-dashboard/create-invoice/${lead.id}`)
    } else if (action === 'draftMessage') {
      navigate(`/attorney-dashboard/draft-message/${lead.id}`)
    } else if (section) {
      const isPost = ['contacted', 'consulted', 'retained'].includes(lead.status || '')
      setLeadPhaseTab(isPost ? 'post' : 'pre')
      navigate(`/attorney-dashboard/lead/${lead.id}/${section}`)
    }
  }, [navigate])

  const openLeadQueue = useCallback(
    (
      overrides: Partial<typeof DEFAULT_CASE_LEADS_FILTER>,
      options?: { pipelineTile?: string | null; openConsultCalendar?: boolean },
    ) => {
      const nextFilters = { ...DEFAULT_CASE_LEADS_FILTER, ...overrides }
      setCaseLeadsFilter(nextFilters)
      setActivePipelineTile(options?.pipelineTile ?? (nextFilters.pipelineStage || null))
      setActiveTab('leads')
      if (options?.openConsultCalendar) {
        setConsultCalendarModalOpen(true)
      }
      scrollToCasesFilters()
    },
    [scrollToCasesFilters],
  )

  const prepareLeadWorkspace = useCallback((lead: any) => {
    setSelectedLead(lead)
    const isPost = ['contacted', 'consulted', 'retained'].includes(lead.status || '')
    setLeadPhaseTab(isPost ? 'post' : 'pre')
    return lead
  }, [])

  const handleDailyQueueAction = useCallback((item: NonNullable<DashboardData['needsActionToday']>[number]) => {
    const lead = dashboardData?.recentLeads.find((entry) => entry.id === item.leadId)
    if (!lead) {
      navigate(`/attorney-dashboard/lead/${item.leadId}/${item.targetSection || 'overview'}`)
      return
    }

    prepareLeadWorkspace(lead)

    if (item.actionType === 'request_documents') {
      navigate(`/attorney-dashboard/request-docs/${lead.id}`, {
        state: {
          prefill: {
            requestedDocs: item.requestedDocs,
            customMessage: item.customMessage,
          },
          source: 'daily-queue',
        },
      })
      return
    }

    if (item.actionType === 'send_message') {
      setChatDraftPrefill(item.messageDraft || '')
      setChatDrawerOpen(true)
      navigate(`/attorney-dashboard/lead/${lead.id}/overview`)
      return
    }

    if (item.actionType === 'schedule_consult') {
      navigate(`/attorney-dashboard/schedule-consult/${lead.id}`)
      return
    }

    if (item.actionType === 'review_task') {
      navigate(`/attorney-dashboard/lead/${lead.id}/tasks`)
      return
    }

    if (item.actionType === 'open_demand') {
      navigate(`/attorney-dashboard/lead/${lead.id}/demand`)
      return
    }

    if (item.actionType === 'open_negotiation') {
      navigate(`/attorney-dashboard/lead/${lead.id}/negotiation`)
      return
    }

    navigate(`/attorney-dashboard/lead/${lead.id}/${item.targetSection || 'overview'}`)
  }, [dashboardData?.recentLeads, navigate, prepareLeadWorkspace])

  const handleAutomationFeedAction = useCallback((item: NonNullable<DashboardData['automationFeed']>[number]) => {
    const section = item.targetSection || 'overview'
    navigate(`/attorney-dashboard/lead/${item.leadId}/${section}`)
  }, [navigate])

  const handleDismissAutomationFeedItem = useCallback(async (item: NonNullable<DashboardData['automationFeed']>[number]) => {
    try {
      await updateLeadReminder(item.leadId, item.id, { status: 'dismissed' })
      setDashboardData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          automationFeed: (prev.automationFeed || []).filter((entry) => entry.id !== item.id),
        }
      })
    } catch (error) {
      console.error('Failed to dismiss automation feed item:', error)
    }
  }, [])

  const handleSnoozeAutomationFeedItem = useCallback(async (
    item: NonNullable<DashboardData['automationFeed']>[number],
    days: number,
  ) => {
    try {
      const base = new Date(item.dueAt)
      const nextDueAt = new Date(Math.max(base.getTime(), Date.now()))
      nextDueAt.setDate(nextDueAt.getDate() + days)
      await updateLeadReminder(item.leadId, item.id, {
        dueAt: nextDueAt.toISOString(),
        status: 'scheduled',
      })
      setDashboardData((prev) => {
        if (!prev) return prev
        const updated = (prev.automationFeed || []).map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                dueAt: nextDueAt.toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'scheduled',
                activityTrail: [
                  ...(entry.activityTrail || []),
                  { label: `Snoozed ${days} day${days === 1 ? '' : 's'}`, at: new Date().toISOString() },
                ].slice(-3),
              }
            : entry,
        )
        updated.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
        return {
          ...prev,
          automationFeed: updated,
        }
      })
    } catch (error) {
      console.error('Failed to snooze automation feed item:', error)
    }
  }, [])

  const leadById = useMemo(
    () => new Map((dashboardData?.recentLeads || []).map((lead) => [lead.id, lead])),
    [dashboardData?.recentLeads],
  )

  const isAutomationFeedDueToday = useCallback((item: NonNullable<DashboardData['automationFeed']>[number]) => {
    const due = new Date(item.dueAt)
    const now = new Date()
    return (
      due.getFullYear() === now.getFullYear() &&
      due.getMonth() === now.getMonth() &&
      due.getDate() === now.getDate()
    )
  }, [])

  const isAutomationFeedResolved = useCallback((item: NonNullable<DashboardData['automationFeed']>[number]) => {
    const lead = leadById.get(item.leadId)
    const readiness = lead?.demandReadiness
    if (!readiness) return false

    if (item.category === 'missing_docs') {
      return !readiness.blockers.some((blocker) =>
        ['medical_records', 'bills', 'police_report', 'injury_photos', 'pending_doc_request'].includes(blocker.key),
      )
    }

    if (item.category === 'treatment_gap') {
      return !readiness.blockers.some((blocker) => ['treatment_gap', 'treatment'].includes(blocker.key))
    }

    if (item.category === 'negotiation') {
      return readiness.nextAction.targetSection !== 'negotiation'
    }

    if (item.category === 'demand_ready') {
      return !readiness.isDemandReady && readiness.nextAction.targetSection !== 'demand'
    }

    return false
  }, [leadById])

  const sortAutomationFeedItems = useCallback((
    items: NonNullable<DashboardData['automationFeed']>,
  ) => {
    const severityRank: Record<'high' | 'medium' | 'low', number> = { high: 0, medium: 1, low: 2 }
    return [...items].sort((a, b) => {
      if (automationFeedSort === 'recent') {
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      }
      if (automationFeedSort === 'severity') {
        const severityDelta = severityRank[a.severity] - severityRank[b.severity]
        if (severityDelta !== 0) return severityDelta
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
      }
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
    })
  }, [automationFeedSort])

  const handleBulkOpenAutomationFeedItems = useCallback((
    items: NonNullable<DashboardData['automationFeed']>,
  ) => {
    const routes = Array.from(new Set(items.map((item) => `/attorney-dashboard/lead/${item.leadId}/${item.targetSection || 'overview'}`)))
    if (routes.length === 0) return
    if (routes.length === 1) {
      navigate(routes[0])
      return
    }
    routes.forEach((route) => {
      if (typeof window !== 'undefined' && typeof window.open === 'function') {
        window.open(route, '_blank', 'noopener,noreferrer')
      }
    })
  }, [navigate])

  const handleBulkSnoozeAutomationFeedGroup = useCallback(async (
    items: NonNullable<DashboardData['automationFeed']>,
    days: number,
  ) => {
    try {
      const updates = await Promise.all(items.map(async (item) => {
        const base = new Date(item.dueAt)
        const nextDueAt = new Date(Math.max(base.getTime(), Date.now()))
        nextDueAt.setDate(nextDueAt.getDate() + days)
        await updateLeadReminder(item.leadId, item.id, {
          dueAt: nextDueAt.toISOString(),
          status: 'scheduled',
        })
        return { id: item.id, dueAt: nextDueAt.toISOString() }
      }))

      setDashboardData((prev) => {
        if (!prev) return prev
        const dueAtById = new Map(updates.map((item) => [item.id, item.dueAt]))
      const nowIso = new Date().toISOString()
        const updated = (prev.automationFeed || []).map((entry) =>
          dueAtById.has(entry.id)
            ? {
                ...entry,
                dueAt: dueAtById.get(entry.id) as string,
                updatedAt: nowIso,
                status: 'scheduled',
                activityTrail: [
                  ...(entry.activityTrail || []),
                  { label: `Snoozed ${days} day${days === 1 ? '' : 's'}`, at: nowIso },
                ].slice(-3),
              }
            : entry,
        )
        updated.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
        return {
          ...prev,
          automationFeed: updated,
        }
      })
    } catch (error) {
      console.error('Failed to bulk snooze automation feed group:', error)
    }
  }, [])

  const handleDismissResolvedAutomationFeedGroup = useCallback(async (
    items: NonNullable<DashboardData['automationFeed']>,
  ) => {
    const resolvedItems = items.filter((item) => isAutomationFeedResolved(item))
    if (resolvedItems.length === 0) return
    try {
      await Promise.all(
        resolvedItems.map((item) => updateLeadReminder(item.leadId, item.id, { status: 'dismissed' })),
      )
      setDashboardData((prev) => {
        if (!prev) return prev
        const resolvedIds = new Set(resolvedItems.map((item) => item.id))
        return {
          ...prev,
          automationFeed: (prev.automationFeed || []).filter((entry) => !resolvedIds.has(entry.id)),
        }
      })
    } catch (error) {
      console.error('Failed to dismiss resolved automation feed items:', error)
    }
  }, [isAutomationFeedResolved])

  const filteredAutomationFeed = useMemo(
    () => sortAutomationFeedItems(
      (dashboardData?.automationFeed || []).filter((item) => {
        if (automationFeedFilter === 'high') return item.severity === 'high'
        if (automationFeedFilter === 'resolved') return isAutomationFeedResolved(item)
        if (automationFeedFilter === 'due_today') return isAutomationFeedDueToday(item)
        return true
      }),
    ),
    [automationFeedFilter, dashboardData?.automationFeed, isAutomationFeedDueToday, isAutomationFeedResolved, sortAutomationFeedItems],
  )

  const automationFeedGroups = useMemo(() => (
    Object.entries(
      filteredAutomationFeed.reduce((acc, item) => {
        const key = item.category || 'general'
        if (!acc[key]) acc[key] = []
        acc[key].push(item)
        return acc
      }, {} as Record<string, NonNullable<DashboardData['automationFeed']>>),
    )
  ), [filteredAutomationFeed])

  const visibleResolvedAutomationFeedCount = useMemo(
    () => filteredAutomationFeed.filter((item) => isAutomationFeedResolved(item)).length,
    [filteredAutomationFeed, isAutomationFeedResolved],
  )

  const automationFeedFilterCounts = useMemo(() => ({
    all: (dashboardData?.automationFeed || []).length,
    high: (dashboardData?.automationFeed || []).filter((item) => item.severity === 'high').length,
    resolved: (dashboardData?.automationFeed || []).filter((item) => isAutomationFeedResolved(item)).length,
    due_today: (dashboardData?.automationFeed || []).filter((item) => isAutomationFeedDueToday(item)).length,
  }), [dashboardData?.automationFeed, isAutomationFeedDueToday, isAutomationFeedResolved])

  const clearSelectedLeads = () => setSelectedLeadIds(new Set())

  const handlePipelineTileClick = (tile: 'matched' | 'accepted' | 'contacted' | 'consultScheduled' | 'retained' | 'closed') => {
    const statusMap: Record<string, string> = {
      matched: 'submitted',
      accepted: 'contacted',
      contacted: 'contacted',
      consultScheduled: 'consulted',
      retained: 'retained',
      closed: 'rejected'
    }
    openLeadQueue(
      { status: statusMap[tile], pipelineStage: tile },
      { pipelineTile: tile, openConsultCalendar: tile === 'consultScheduled' },
    )
  }

  const handleAddCaseQuickAction = useCallback(async () => {
    try {
      setBulkActionLoading(true)
      setBulkActionMessage('Creating draft case...')
      const data = await createManualIntake({ template: 'PI' })
      setBulkActionMessage('Draft case created. Opening intake...')
      navigate(`/edit-assessment/${data.assessmentId}`)
    } catch (err: any) {
      setBulkActionMessage(err?.response?.data?.error || 'Failed to create draft case')
      setTimeout(() => setBulkActionMessage(null), 5000)
    } finally {
      setBulkActionLoading(false)
    }
  }, [navigate])

  const loadFirmAttorneys = useCallback(async () => {
    try {
      const response = await loadFirmDashboardSummary()
      const attorneys = Array.isArray(response?.attorneys) ? response.attorneys : []
      setFirmAttorneys(
        attorneys.map((attorney: any) => ({
          id: attorney.id,
          name: attorney.name,
          email: attorney.email || null
        }))
      )
    } catch (err: any) {
      if (err.response?.status === 404) {
        setFirmAttorneys([])
        return
      }
      console.error('Failed to load firm attorneys:', err)
      setFirmAttorneys([])
    }
  }, [])

  const loadCalendarConnections = useCallback(async () => {
    try {
      setCalendarConnectionsLoading(true)
      const response = await getAttorneyCalendarHealth()
      setCalendarConnections(Array.isArray(response?.connections) ? response.connections : [])
      setCalendarHealthSummary(response?.summary || null)
    } catch (err: any) {
      console.error('Failed to load calendar connections:', err)
      setCalendarConnections([])
      setCalendarHealthSummary(null)
    } finally {
      setCalendarConnectionsLoading(false)
    }
  }, [])

  const loadDashboardData = useCallback(async (retryCount = 0) => {
    try {
      setLoading(true)
      setError(null)
      
      // Verify auth token exists
      if (!hasValidAuthToken()) {
        setError('Authentication required. Please log in.')
        navigate(getLoginRedirect('/attorney-dashboard', 'attorney'))
        return
      }
      
      const token = localStorage.getItem('auth_token')
      console.log('Loading dashboard data, attempt:', retryCount + 1)
      console.log('Auth token present:', !!token)
      console.log('User from localStorage:', localStorage.getItem('user'))
      console.log('Attorney from localStorage:', localStorage.getItem('attorney'))
      
      // Get actual dashboard data from API
      let response
      try {
        response = await getAttorneyDashboard()
        console.log('Dashboard response received:', response)
        
        // Validate response structure
        if (!response) {
          throw new Error('Empty response from dashboard API')
        }
        if (!response.dashboard) {
          console.warn('Response missing dashboard object:', response)
          // Create a default dashboard structure
          response.dashboard = {
            totalLeadsReceived: 0,
            totalLeadsAccepted: 0,
            feesCollectedFromPayments: 0,
            totalPlatformSpend: 0,
            pricingModel: 'per_lead'
          }
        }
      } catch (apiError: any) {
        console.error('getAttorneyDashboard API call failed:', apiError)
        console.error('API Error details:', {
          message: apiError?.message,
          response: apiError?.response,
          status: apiError?.response?.status,
          statusText: apiError?.response?.statusText,
          data: apiError?.response?.data,
          config: apiError?.config,
          code: apiError?.code,
          name: apiError?.name,
          request: apiError?.request ? 'Request made' : 'No request'
        })
        
        // If no response, it's likely a network/server issue
        if (!apiError?.response) {
          console.error('⚠️ No response from server - possible network error or server crash')
          if (apiError?.code === 'ECONNREFUSED' || apiError?.code === 'ERR_NETWORK') {
            throw new Error('Cannot connect to server. Please ensure the API server is running on port 4000.')
          } else if (apiError?.code === 'ETIMEDOUT') {
            throw new Error('Request timed out. The server may be overloaded or unresponsive.')
          } else {
            throw new Error(`Network error: ${apiError?.message || 'Unknown error'}`)
          }
        }
        
        throw apiError // Re-throw to be caught by outer catch
      }
      
      // Store attorney info from response if available
      if (response.dashboard?.attorney) {
        const attorneyInfo = {
          id: response.dashboard.attorney.id,
          name: response.dashboard.attorney.name,
          email: response.dashboard.attorney.email
        }
        localStorage.setItem('attorney', JSON.stringify(attorneyInfo))
      }
      
      // Transform API response to match DashboardData interface
      let roiAnalytics: any = null
      try {
        roiAnalytics = await getAttorneyRoiAnalytics({ period: 'monthly' })
      } catch (roiError) {
        console.error('Failed to load ROI analytics:', roiError)
      }

      const dashboardData: DashboardData = {
        dashboard: {
          totalLeadsReceived: response.dashboard?.totalLeadsReceived || 0,
          totalLeadsAccepted: response.dashboard?.totalLeadsAccepted || 0,
          feesCollectedFromPayments: response.dashboard?.feesCollectedFromPayments || 0,
          totalPlatformSpend: response.dashboard?.totalPlatformSpend || 0,
          pricingModel: response.dashboard?.pricingModel || 'per_lead',
          attorney: response.dashboard?.attorney || null
        },
        recentLeads: (response.recentLeads || []).map((lead: any) => ({
          id: lead.id,
          viabilityScore: lead.viabilityScore || 0,
          liabilityScore: lead.liabilityScore || 0,
          causationScore: lead.causationScore || 0,
          damagesScore: lead.damagesScore || 0,
          isExclusive: lead.isExclusive || false,
          sourceType: lead.sourceType || 'unknown',
          hotnessLevel: lead.hotnessLevel || 'cold',
          submittedAt: lead.submittedAt || new Date().toISOString(),
          status: lead.status || 'submitted',
          assessment: lead.assessment || {
            claimType: 'unknown',
            venueState: '',
            venueCounty: '',
            facts: JSON.stringify({})
          },
          contactAttempts: lead.contactAttempts || [],
          conflictChecks: lead.conflictChecks || [],
          qualityReports: lead.qualityReports || [],
          messaging: lead.messaging || { unreadCount: 0, totalCount: 0, awaitingReply: false },
          demandReadiness: lead.demandReadiness || null,
        })),
        qualityMetrics: {
          totalLeads: response.qualityMetrics?.totalLeads || 0,
          averageViability: response.qualityMetrics?.averageViability || 0,
          exclusiveLeads: response.qualityMetrics?.exclusiveLeads || 0,
          hotLeads: response.qualityMetrics?.hotLeads || 0,
          evidenceComplete: response.qualityMetrics?.evidenceComplete || 0
        },
        urgentLeads: response.urgentLeads || [],
        analytics: {
          conversionRate: response.analytics?.conversionRate ?? 0,
          roi: response.analytics?.roi ?? 0,
          averageFee: response.analytics?.averageFee ?? 0
        },
        activeCases: response.activeCases ?? { matched: 0, accepted: 0, contacted: 0, consultScheduled: 0, retained: 0, closed: 0 },
        funnel: response.funnel ?? { matched: 0, accepted: 0, consulted: 0, retained: 0 },
        newCaseMatches: response.newCaseMatches ?? [],
        topCaseToday: response.topCaseToday ?? null,
        roiAnalytics,
        messagingSummary: response.messagingSummary ?? { unreadCount: 0, awaitingResponseCount: 0 },
        pipelineMessageCounts: response.pipelineMessageCounts ?? {},
        caseContactsCount: response.caseContactsCount ?? 0,
        quickActionCounts: response.quickActionCounts ?? {},
        needsActionToday: response.needsActionToday ?? [],
        dailyQueueSummary: response.dailyQueueSummary ?? { total: 0, highSeverity: 0, mediumSeverity: 0, demandReady: 0 },
        automationFeed: response.automationFeed ?? [],
      }
      
      setDashboardData(dashboardData)
      try {
        const intel = await getAnalyticsIntelligence()
        setAnalyticsIntel(intel)
      } catch (intelError) {
        console.error('Failed to load analytics intelligence:', intelError)
        setAnalyticsIntel(null)
      }
    } catch (err: any) {
      console.error('Dashboard error:', err)
      console.error('Error type:', err?.constructor?.name)
      console.error('Error details:', {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        code: err?.code,
        request: err?.request ? 'Request made' : 'No request',
        config: err?.config ? {
          url: err.config.url,
          method: err.config.method,
          headers: err.config.headers
        } : 'No config'
      })
      
      // Check if it's a network error (no response)
      if (!err.response) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
          setError('Cannot connect to server. Please check if the API server is running.')
          return
        } else if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
          setError('Request timed out. Please try again.')
          return
        } else {
          setError('Network error. Please check your connection and try again.')
          return
        }
      }
      
      // If it's a 401, redirect to attorney login
      if (err.response?.status === 401) {
        setError('Please log in to view your dashboard')
        clearStoredAuth()
        navigate(getLoginRedirect('/attorney-dashboard', 'attorney'))
        return
      } else if (err.response?.status === 404) {
        // Attorney profile not found - redirect to login
        // This could mean the user isn't registered as an attorney or needs to log in
        console.log('Attorney profile not found, redirecting to login...')
        clearStoredAuth()
        navigate(getLoginRedirect('/attorney-dashboard', 'attorney'))
        return
      } else {
        // Build detailed error message
        const errorMessage = err.response?.data?.error || err.message || 'Failed to load dashboard data'
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    if (!selectedLead?.id) {
      setLeadCommandCenter(null)
      setCopilotAnswer(null)
      return
    }

    let cancelled = false
    const loadLeadCommandCenter = async () => {
      try {
        setLeadCommandCenterLoading(true)
        const data = await getLeadCommandCenter(selectedLead.id)
        if (!cancelled) {
          setLeadCommandCenter(data)
          setCopilotAnswer(null)
        }
        try {
          const automation = await syncLeadReadinessAutomation(selectedLead.id)
          if (!cancelled && Array.isArray(automation?.tasks) && automation.tasks.length > 0) {
            setTaskItems((prev) => {
              const seen = new Set(prev.map((item) => item.id))
              const merged = [...prev]
              for (const item of automation.tasks) {
                if (!seen.has(item.id)) {
                  merged.unshift(item)
                  seen.add(item.id)
                }
              }
              return merged
            })
          }
        } catch (automationError) {
          console.error('Failed to sync readiness automation:', automationError)
        }
      } catch (error) {
        console.error('Failed to load lead command center:', error)
        if (!cancelled) setLeadCommandCenter(null)
      } finally {
        if (!cancelled) setLeadCommandCenterLoading(false)
      }
    }

    void loadLeadCommandCenter()
    return () => {
      cancelled = true
    }
  }, [selectedLead?.id, setTaskItems])

  const handleAskCommandCenterCopilot = useCallback(async (question: string) => {
    if (!selectedLead?.id) return
    try {
      setCopilotLoading(true)
      const response = await askLeadCommandCenterCopilot(selectedLead.id, question)
      setCopilotAnswer({
        answer: response.answer,
        sources: Array.isArray(response.sources) ? response.sources : [],
      })
    } catch (error) {
      console.error('Failed to ask command center copilot:', error)
    } finally {
      setCopilotLoading(false)
    }
  }, [selectedLead?.id])

  const handleOpenDocumentRequest = useCallback(() => {
    if (selectedLeadIds.size === 0) return
    setDocumentRequestPrefill(null)
    setDocumentRequestModalOpen(true)
  }, [selectedLeadIds.size])

  const handleReviewSuggestedRequest = useCallback((payload: {
    requestedDocs: Array<'police_report' | 'medical_records' | 'injury_photos' | 'wage_loss' | 'insurance' | 'other'>
    customMessage?: string
    sendUploadLinkOnly?: boolean
  }) => {
    if (!selectedLead?.id) return
    setSelectedLeadIds(new Set([selectedLead.id]))
    setDocumentRequestPrefill(payload)
    setDocumentRequestModalOpen(true)
  }, [selectedLead?.id])

  const handleOpenSuggestedRequestPage = useCallback((payload: {
    requestedDocs: Array<'police_report' | 'medical_records' | 'injury_photos' | 'wage_loss' | 'insurance' | 'other'>
    customMessage?: string
    sendUploadLinkOnly?: boolean
  }) => {
    if (!selectedLead?.id) return
    navigate(`/attorney-dashboard/request-docs/${selectedLead.id}`, {
      state: {
        prefill: payload,
        source: 'command-center',
      },
    })
  }, [navigate, selectedLead?.id])

  const handleDraftPlaintiffUpdate = useCallback((message: string) => {
    if (!selectedLead) return
    setChatDraftPrefill(message)
    setChatDrawerOpen(true)
  }, [selectedLead])

  const handleDocumentRequestSubmit = useCallback(async (payload: { requestedDocs: string[]; customMessage?: string; sendUploadLinkOnly?: boolean }) => {
    const ids = [...selectedLeadIds]
    if (ids.length === 0) return
    setBulkActionLoading(true)
    setBulkActionMessage(null)
    try {
      let success = 0
      let failed = 0
      for (const leadId of ids) {
        try {
          await createDocumentRequest(leadId, payload)
          success++
        } catch {
          failed++
        }
      }
      setBulkActionMessage(
        failed === 0
          ? `Document request sent to ${success} plaintiff${success > 1 ? 's' : ''}. They will receive an email with upload link.`
          : `Sent to ${success}, failed for ${failed}.`
      )
      if (success > 0) {
        clearSelectedLeads()
        setDocumentRequestPrefill(null)
        setDocumentRequestModalOpen(false)
        invalidateAttorneyDashboardSummary()
        loadDashboardData(0)
      }
      setTimeout(() => setBulkActionMessage(null), 5000)
    } catch (err: any) {
      setBulkActionMessage(err?.message || 'Failed to send document requests')
      setTimeout(() => setBulkActionMessage(null), 5000)
    } finally {
      setBulkActionLoading(false)
    }
  }, [selectedLeadIds, loadDashboardData])

  const handleOpenScheduleConsult = useCallback(() => {
    if (selectedLeadIds.size !== 1) return
    setScheduleConsultModalOpen(true)
  }, [selectedLeadIds.size])

  const handleScheduleConsultSubmit = useCallback(async (payload: { date: string; time: string; meetingType: string; notes?: string }) => {
    const ids = [...selectedLeadIds]
    if (ids.length !== 1) return
    const leadId = ids[0]
    setBulkActionLoading(true)
    setBulkActionMessage(null)
    try {
      await scheduleConsultation(leadId, payload)
      setBulkActionMessage('Consultation scheduled. Plaintiff will receive an email and calendar invite.')
      clearSelectedLeads()
      setScheduleConsultModalOpen(false)
      invalidateAttorneyDashboardSummary()
      loadDashboardData(0)
      setTimeout(() => setBulkActionMessage(null), 5000)
    } catch (err: any) {
      setBulkActionMessage(err?.message || 'Failed to schedule consultation')
      setTimeout(() => setBulkActionMessage(null), 5000)
    } finally {
      setBulkActionLoading(false)
    }
  }, [selectedLeadIds, loadDashboardData])

  const updateLeadInState = useCallback((leadId: string, updates: Partial<Lead>) => {
    setDashboardData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        recentLeads: prev.recentLeads.map(lead =>
          lead.id === leadId ? { ...lead, ...updates } : lead
        )
      }
    })
    setSelectedLead(prev => (prev && prev.id === leadId ? { ...prev, ...updates } : prev))
  }, [])
  const {
    analysisLoading,
    decisionBenchmark,
    decisionProfileLoading,
    decisionSummary,
    demandDraftContent,
    demandDraftId,
    demandDraftLoading,
    demandDraftMessage,
    handleDownloadDemandDocx,
    handleDraftDemandLetter,
    handleRegenerateAnalysis,
    handleSaveDecisionProfile,
    handleViewLatestDraft,
    negotiationStyle,
    riskTolerance,
    setNegotiationStyle,
    setRiskTolerance,
  } = useAttorneyDecisionSupport(selectedLead?.id, updateLeadInState, setSelectedLead, (message) => setError(message))
  const {
    contactForm,
    contactHistory,
    contactLoading,
    handleCreateContactFromCommand,
    handleLogContact,
    handleQuickCall,
    handleQuickConsult,
    handleQuickMessage,
    reloadContacts,
    setContactForm,
  } = useAttorneyCommunications(
    selectedLead,
    dashboardData?.recentLeads || [],
    updateLeadInState,
    (lead) => setSelectedLead(lead as Lead),
    setWorkstreamTab,
    (message) => setError(message),
  )

  useEffect(() => {
    if (!leadIdParam || !dashboardData?.recentLeads?.length) return
    const found = dashboardData.recentLeads.find(lead => lead.id === leadIdParam)
    if (found && (!selectedLead || selectedLead.id !== found.id)) {
      setSelectedLead(found)
    }
  }, [leadIdParam, dashboardData?.recentLeads, selectedLead])

  useEffect(() => {
    if (!selectedLead) return
    const isPreAcceptance = !selectedLead.status || selectedLead.status === 'submitted'
    setLeadPhaseTab(isPreAcceptance ? 'pre' : 'post')
  }, [selectedLead?.id, selectedLead?.status])

  useEffect(() => {
    if (!selectedLead) return
    setTransferAttorneyId('')
    setTransferMessage(null)
    loadFirmAttorneys()
  }, [selectedLead?.id, loadFirmAttorneys])

  const handleLeadDecision = useCallback(
    async (
      leadId: string,
      decision: 'accept' | 'reject',
      rationaleOverride?: string,
      declineReason?: string
    ) => {
      const rationale = (rationaleOverride ?? decisionRationale).trim()
      try {
        setLeadDecisionLoading(true)
        if (rationale && decision === 'accept') {
          await saveLeadDecisionOverride(leadId, { decision, rationale })
        }
        const updated = await decideLead(
          leadId,
          decision,
          rationale || undefined,
          declineReason
        )
        updateLeadInState(leadId, {
          status: updated.status || (decision === 'accept' ? 'contacted' : 'rejected')
        })
        invalidateAttorneyDashboardSummary()
        setDecisionRationale('')
      } catch (err: any) {
        console.error('Failed to update lead decision:', err)
        setError(err.response?.data?.error || 'Failed to update lead decision')
      } finally {
        setLeadDecisionLoading(false)
      }
    },
    [updateLeadInState, decisionRationale]
  )

  const handleTransferLead = useCallback(async () => {
    if (!selectedLead || !transferAttorneyId) return
    try {
      setTransferLoading(true)
      setTransferMessage(null)
      const updated = await transferLeadToFirmAttorney(selectedLead.id, transferAttorneyId)
      updateLeadInState(selectedLead.id, {
        assignedAttorneyId: updated.assignedAttorneyId
      })
      invalidateFirmDashboardSummary()
      setTransferMessage('Lead transferred successfully.')
    } catch (err: any) {
      setTransferMessage(err.response?.data?.error || 'Failed to transfer lead.')
    } finally {
      setTransferLoading(false)
    }
  }, [selectedLead, transferAttorneyId, updateLeadInState])

  const handleStatusUpdate = useCallback(async (status: 'contacted' | 'consulted' | 'retained') => {
    if (!selectedLead?.id) return
    try {
      setLeadDecisionLoading(true)
      const updated = await updateLeadStatus(selectedLead.id, status)
      updateLeadInState(selectedLead.id, { status: updated.status || status })
    } catch (err: any) {
      console.error('Failed to update lead status:', err)
      setError(err.response?.data?.error || 'Failed to update lead status')
    } finally {
      setLeadDecisionLoading(false)
    }
  }, [selectedLead?.id, updateLeadInState])

  const handleDownloadCaseFile = useCallback(async () => {
    if (!selectedLead?.id) return
    try {
      setCaseFileLoading(true)
      const blob = await downloadLeadCaseFile(selectedLead.id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `case-file-${selectedLead.id}.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('Failed to download case file:', err)
      setError(err.response?.data?.error || 'Failed to download case file')
    } finally {
      setCaseFileLoading(false)
    }
  }, [selectedLead?.id])

  useEffect(() => {
    if (!hasValidAuthToken()) {
      navigate(getLoginRedirect('/attorney-dashboard', 'attorney'))
      return
    }

    const timer = setTimeout(() => {
      loadDashboardData()
    }, 100)
    return () => clearTimeout(timer)
  }, [navigate, loadDashboardData])

  useEffect(() => {
    if (!hasValidAuthToken()) return
    void loadCalendarConnections()
  }, [loadCalendarConnections])

  // Keep dashboard navigation and lead filters restorable from the URL.
  useEffect(() => {
    if (isLeadSection) return
    const nextParams = new URLSearchParams(searchParams)
    if (activeTab === 'overview') nextParams.delete('tab')
    else nextParams.set('tab', activeTab)

    const filterMap: Array<[string, string]> = [
      ['caseType', caseLeadsFilter.caseType],
      ['valueRange', caseLeadsFilter.valueRange],
      ['status', caseLeadsFilter.status],
      ['stage', caseLeadsFilter.pipelineStage],
      ['evidence', caseLeadsFilter.evidenceLevel],
      ['jurisdiction', caseLeadsFilter.jurisdiction],
    ]
    filterMap.forEach(([key, value]) => {
      if (value) nextParams.set(key, value)
      else nextParams.delete(key)
    })

    const current = searchParams.toString()
    const next = nextParams.toString()
    if (current !== next) {
      setSearchParams(nextParams, { replace: true })
    }
  }, [activeTab, caseLeadsFilter, isLeadSection, searchParams, setSearchParams])

  // Open Cases tab when navigating via ?tab=leads or other deep-link filters.
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (ATTORNEY_DASHBOARD_TABS.includes(tab as (typeof ATTORNEY_DASHBOARD_TABS)[number]) && tab !== activeTab) {
      setActiveTab(tab as (typeof ATTORNEY_DASHBOARD_TABS)[number])
    }
  }, [searchParams])

  // Open lead picker when navigating via ?action=scheduleConsult (e.g. from Events page)
  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'scheduleConsult') {
      handleQuickAction('scheduleConsult')
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('action')
      setSearchParams(nextParams, { replace: true })
    }
  }, [searchParams, handleQuickAction, setSearchParams])

  useEffect(() => {
    const calendarSync = searchParams.get('calendar_sync')
    const provider = searchParams.get('calendar_provider')
    const calendarError = searchParams.get('calendar_error')
    if (!calendarSync || !provider) {
      return
    }

    if (calendarSync === 'success') {
      setBulkActionMessage(`${provider === 'google' ? 'Google' : 'Microsoft'} calendar connected.`)
      void loadCalendarConnections()
    } else {
      setBulkActionMessage(calendarError || 'Calendar connection failed.')
    }
    const timer = window.setTimeout(() => setBulkActionMessage(null), 5000)

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('calendar_sync')
    nextParams.delete('calendar_provider')
    nextParams.delete('calendar_error')
    setSearchParams(nextParams, { replace: true })

    return () => window.clearTimeout(timer)
  }, [searchParams, setSearchParams, loadCalendarConnections])

  const handleConnectCalendar = useCallback(async (provider: 'google' | 'microsoft') => {
    try {
      setCalendarActionProvider(provider)
      const response = await getAttorneyCalendarConnectUrl(provider)
      window.location.assign(response.authorizeUrl)
    } catch (err: any) {
      setBulkActionMessage(err?.response?.data?.error || `Failed to connect ${provider} calendar.`)
      setTimeout(() => setBulkActionMessage(null), 5000)
    } finally {
      setCalendarActionProvider(null)
    }
  }, [])

  const handleSyncCalendarConnection = useCallback(async (provider: 'google' | 'microsoft') => {
    try {
      setCalendarActionProvider(provider)
      const response = await syncAttorneyCalendar(provider)
      setBulkActionMessage(
        `Synced ${response.syncedBlocks} busy time block(s) from ${provider === 'google' ? 'Google' : 'Microsoft'}${response.autoSyncEnabled ? '. Auto-sync is active.' : '.'}`
      )
      await loadCalendarConnections()
    } catch (err: any) {
      setBulkActionMessage(err?.response?.data?.error || `Failed to sync ${provider} calendar.`)
    } finally {
      setCalendarActionProvider(null)
      setTimeout(() => setBulkActionMessage(null), 5000)
    }
  }, [loadCalendarConnections])

  const handleDisconnectCalendarConnection = useCallback(async (provider: 'google' | 'microsoft') => {
    try {
      setCalendarActionProvider(provider)
      await disconnectAttorneyCalendar(provider)
      setBulkActionMessage(`${provider === 'google' ? 'Google' : 'Microsoft'} calendar disconnected.`)
      await loadCalendarConnections()
    } catch (err: any) {
      setBulkActionMessage(err?.response?.data?.error || `Failed to disconnect ${provider} calendar.`)
    } finally {
      setCalendarActionProvider(null)
      setTimeout(() => setBulkActionMessage(null), 5000)
    }
  }, [loadCalendarConnections])

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

  const safeJsonParse = (value: any, fallback: any = null) => {
    if (!value) return fallback
    if (typeof value === 'object') return value
    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }

  const formatClaimType = (value: string) => {
    return value ? value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Unknown'
  }

  const formatRelativeDate = (dateString?: string) => {
    if (!dateString) return 'Not provided'
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return 'Not provided'
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays < 1) return 'Today'
    if (diffDays < 30) return `~${diffDays} days ago`
    const diffMonths = Math.floor(diffDays / 30)
    if (diffMonths < 12) return `~${diffMonths} months ago`
    const diffYears = Math.floor(diffMonths / 12)
    return `~${diffYears} years ago`
  }

  const getLeadFacts = (lead: Lead | null) => {
    if (!lead) return {}
    return safeJsonParse(lead.assessment?.facts, {})
  }

  const getLeadPrediction = (lead: Lead | null) => {
    if (!lead) return null
    const predictions = lead.assessment?.predictions
    if (!Array.isArray(predictions) || predictions.length === 0) return null
    const sorted = [...predictions].sort((a, b) => {
      const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0
      return aTime - bTime
    })
    const latest = sorted[sorted.length - 1]
    return {
      viability: safeJsonParse(latest?.viability, {}),
      bands: safeJsonParse(latest?.bands, {}),
      explain: safeJsonParse(latest?.explain, {})
    }
  }

  const getLeadAnalysis = (lead: Lead | null) => {
    if (!lead) return null
    const raw = lead.assessment?.chatgptAnalysis
    const parsed = safeJsonParse(raw, null)
    if (!parsed) return null
    if (parsed.analysis) return parsed.analysis
    if (parsed.data?.analysis) return parsed.data.analysis
    return parsed
  }

  const getAgeRange = (facts: any) => {
    const ageRange = facts?.claimant?.ageRange || facts?.personal?.ageRange || facts?.ageRange
    if (ageRange) return String(ageRange)
    const age = facts?.claimant?.age || facts?.personal?.age || facts?.age
    if (typeof age === 'number') {
      const min = Math.floor(age / 10) * 10
      return `${min}-${min + 9}`
    }
    return 'Not provided'
  }

  const summarizeNarrative = (narrative?: string) => {
    if (!narrative) return 'Not provided'
    const clean = narrative.replace(/\s+/g, ' ').trim()
    return clean.length > 180 ? `${clean.slice(0, 180)}...` : clean
  }

  const getConfidenceBand = (bands: any) => {
    if (!bands || typeof bands !== 'object') return 'low'
    const median = Number(bands.median || 0)
    const p25 = Number(bands.p25 || 0)
    const p75 = Number(bands.p75 || 0)
    if (!median || !p25 || !p75) return 'low'
    const widthRatio = Math.abs(p75 - p25) / median
    if (widthRatio <= 0.5) return 'high'
    if (widthRatio <= 1) return 'medium'
    return 'low'
  }

  const getConfidenceScore = (band: string) => {
    if (band === 'high') return 85
    if (band === 'medium') return 65
    return 40
  }

  const getKeyDrivers = (predictionExplain: any, fallback: string[]) => {
    const drivers = predictionExplain?.drivers || predictionExplain?.keyDrivers || predictionExplain?.factors
    if (Array.isArray(drivers) && drivers.length > 0) {
      return drivers.slice(0, 3).map((d) => String(d))
    }
    return fallback
  }

  const getTreatmentContinuity = (treatments: any[]) => {
    if (!Array.isArray(treatments) || treatments.length === 0) return 'unknown'
    if (treatments.length >= 2) return 'good'
    return 'fragmented'
  }

  const getSeverityScore = (facts: any) => {
    const medCharges = Number(facts?.damages?.med_charges || 0)
    if (medCharges >= 100000) return { level: 4, label: 'catastrophic' }
    if (medCharges >= 50000) return { level: 3, label: 'severe' }
    if (medCharges >= 10000) return { level: 2, label: 'moderate' }
    if (medCharges > 0) return { level: 1, label: 'minor' }
    return { level: 0, label: 'unknown' }
  }

  const getAdjusterPrediction = (lead: Lead) => {
    const liability = lead.liabilityScore
    const damages = lead.damagesScore
    if (liability >= 0.7 && damages >= 0.7) return { posture: 'litigate', risk: 'low' }
    if (liability >= 0.6) return { posture: 'negotiate', risk: 'medium' }
    return { posture: 'lowball', risk: 'high' }
  }

  const buildMedicalChronology = (facts: any) => {
    const treatments = Array.isArray(facts?.treatment) ? facts.treatment : []
    const sorted = [...treatments].sort((a, b) => {
      const aTime = a?.date ? new Date(a.date).getTime() : 0
      const bTime = b?.date ? new Date(b.date).getTime() : 0
      return aTime - bTime
    })
    const timeline = sorted.map((t: any) => {
      const date = t?.date ? new Date(t.date).toLocaleDateString() : 'Date unknown'
      const provider = t?.provider || t?.type || 'Provider unknown'
      const diagnosis = t?.diagnosis ? ` • Dx: ${t.diagnosis}` : ''
      const treatment = t?.treatment ? ` • Tx: ${t.treatment}` : ''
      return `${date} — ${provider}${diagnosis}${treatment}`
    })

    const providerCounts = sorted.reduce((acc: Record<string, number>, t: any) => {
      const key = t?.provider || t?.type || 'Provider unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    const providerGroups = Object.entries(providerCounts).map(([provider, count]) => `${provider} (${count})`)

    const gaps: string[] = []
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1]?.date ? new Date(sorted[i - 1].date).getTime() : null
      const curr = sorted[i]?.date ? new Date(sorted[i].date).getTime() : null
      if (prev && curr) {
        const diffDays = Math.floor((curr - prev) / (1000 * 60 * 60 * 24))
        if (diffDays >= 60) {
          gaps.push(`Gap of ~${diffDays} days between ${new Date(prev).toLocaleDateString()} and ${new Date(curr).toLocaleDateString()}`)
        }
      }
    }

    const redFlags: string[] = []
    if (sorted.length === 0) redFlags.push('No treatment records provided')
    if (sorted.some(t => !t?.date)) redFlags.push('Missing treatment dates')
    if (sorted.some(t => !t?.provider && !t?.type)) redFlags.push('Missing provider/type on treatments')
    if (sorted.length === 1) redFlags.push('Single treatment entry')

    const summary = sorted.length > 0
      ? `Documented ${sorted.length} treatment entries across ${providerGroups.length} provider group${providerGroups.length === 1 ? '' : 's'}.`
      : 'No treatment chronology available.'

    return {
      summary,
      timeline,
      providerGroups,
      gapsAndRedFlags: [...gaps, ...redFlags]
    }
  }

  const getHotnessColor = (level: string) => {
    switch (level) {
      case 'hot': return 'text-red-600 bg-red-100'
      case 'warm': return 'text-orange-600 bg-orange-100'
      case 'cold': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getFlowStatus = (lead: any) => {
    const status = lead?.status || ''
    if (status === 'retained') return { label: 'Retained', color: 'bg-emerald-100 text-emerald-800' }
    if (status === 'consulted') return { label: 'Consult Scheduled', color: 'bg-brand-100 text-brand-800' }
    if (status === 'contacted') return hasMadeContact(lead) ? { label: 'Contacted', color: 'bg-blue-100 text-blue-800' } : { label: 'Accepted', color: 'bg-amber-100 text-amber-800' }
    if (status === 'submitted' || !status) return { label: 'Matched', color: 'bg-violet-100 text-violet-800' }
    if (status === 'rejected') return { label: 'Closed', color: 'bg-gray-100 text-gray-800' }
    return { label: 'Matched', color: 'bg-violet-100 text-violet-800' }
  }

  const hasMadeContact = (lead: any) => {
    if (lead?.lastContactAt) return true
    const attempts = (lead?.contactAttempts || []).filter((attempt: any) => attempt.completedAt)
    return attempts.length > 0
  }

  const getHoursAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    return hours
  }

  const selectedLeadFacts = selectedLead ? getLeadFacts(selectedLead) : {}
  const selectedLeadPrediction = selectedLead ? getLeadPrediction(selectedLead) : null
  const selectedLeadAnalysis = selectedLead ? getLeadAnalysis(selectedLead) : null
  const currentAttorneyId = dashboardData?.dashboard?.attorney?.id || null
  const currentUserEmail = (() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored).email : null
    } catch {
      return null
    }
  })()

  const leadWrapperClass = isLeadSection
    ? 'py-6'
    : 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50'
  const leadContainerClass = isLeadSection
    ? 'mx-auto w-11/12 md:w-3/4 lg:w-2/3 border border-gray-200 shadow-lg rounded-md bg-white p-5'
    : 'relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white'

  const renderWorkstream = (sectionKey: string) => {
    if (!isPostAcceptance) {
      return (
        <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-600">
          This lead is still in pre-acceptance. Focused workstreams unlock after acceptance.
        </div>
      )
    }

    if (!selectedLead) {
      return null
    }

    switch (sectionKey) {
      case 'overview': {
        return (
          <Suspense fallback={<AttorneyDashboardPanelSkeleton message="Loading case overview..." />}>
            <AttorneyDashboardWorkstreamOverview
              selectedLead={selectedLead}
              selectedLeadFacts={selectedLeadFacts}
              selectedLeadPrediction={selectedLeadPrediction}
              selectedLeadAnalysis={selectedLeadAnalysis}
              leadEvidenceFiles={leadEvidenceFiles}
              contactHistory={contactHistory}
              buildMedicalChronology={buildMedicalChronology}
              formatRelativeDate={formatRelativeDate}
              getTreatmentContinuity={getTreatmentContinuity}
              getSeverityScore={getSeverityScore}
              getAdjusterPrediction={getAdjusterPrediction}
              goToSection={goToSection}
              handleStatusUpdate={(status: 'contacted' | 'consulted' | 'retained') => handleStatusUpdate(status)}
              handleCreateContactFromCommand={handleCreateContactFromCommand}
            />
          </Suspense>
        )
      }
      case 'chronology': {
        return (
          <Suspense fallback={<AttorneyDashboardPanelSkeleton message="Loading chronology..." />}>
            <AttorneyDashboardDeferredInlineWorkstream
              sectionKey="chronology"
              selectedLead={selectedLead}
              selectedLeadFacts={selectedLeadFacts}
              buildMedicalChronology={buildMedicalChronology}
              caseShareForm={caseShareForm}
              setCaseShareForm={setCaseShareForm}
              handleCreateCaseShare={handleCreateCaseShare}
              caseShareMessage={caseShareMessage}
              caseShares={caseShares}
              currentUserEmail={currentUserEmail}
              currentAttorneyId={currentAttorneyId}
              handleAcceptCaseShare={handleAcceptCaseShare}
              handleDeclineCaseShare={handleDeclineCaseShare}
              referralForm={referralForm}
              setReferralForm={setReferralForm}
              handleCreateReferral={handleCreateReferral}
              referralMessage={referralMessage}
              referrals={referrals}
              handleAcceptReferral={handleAcceptReferral}
              handleDeclineReferral={handleDeclineReferral}
              coCounselForm={coCounselForm}
              setCoCounselForm={setCoCounselForm}
              handleCreateCoCounselWorkflow={handleCreateCoCounselWorkflow}
              coCounselMessage={coCounselMessage}
              coCounselWorkflows={coCounselWorkflows}
              handleAcceptCoCounsel={handleAcceptCoCounsel}
              handleDeclineCoCounsel={handleDeclineCoCounsel}
              financeSummary={financeSummary}
              financeModel={financeModel}
              setFinanceModel={setFinanceModel}
              financeMessage={financeMessage}
              financeLoading={financeLoading}
              handleDownloadFinanceUnderwritingPdf={handleDownloadFinanceUnderwritingPdf}
              handleDownloadFinanceDataroom={handleDownloadFinanceDataroom}
              handleStatusUpdate={(status: 'contacted' | 'consulted' | 'retained') => handleStatusUpdate(status)}
              leadDecisionLoading={leadDecisionLoading}
            />
          </Suspense>
        )
      }
      case 'referrals': {
        return (
          <Suspense fallback={<AttorneyDashboardPanelSkeleton message="Loading referral workflows..." />}>
            <AttorneyDashboardDeferredInlineWorkstream
              sectionKey="referrals"
              selectedLead={selectedLead}
              selectedLeadFacts={selectedLeadFacts}
              buildMedicalChronology={buildMedicalChronology}
              caseShareForm={caseShareForm}
              setCaseShareForm={setCaseShareForm}
              handleCreateCaseShare={handleCreateCaseShare}
              caseShareMessage={caseShareMessage}
              caseShares={caseShares}
              currentUserEmail={currentUserEmail}
              currentAttorneyId={currentAttorneyId}
              handleAcceptCaseShare={handleAcceptCaseShare}
              handleDeclineCaseShare={handleDeclineCaseShare}
              referralForm={referralForm}
              setReferralForm={setReferralForm}
              handleCreateReferral={handleCreateReferral}
              referralMessage={referralMessage}
              referrals={referrals}
              handleAcceptReferral={handleAcceptReferral}
              handleDeclineReferral={handleDeclineReferral}
              coCounselForm={coCounselForm}
              setCoCounselForm={setCoCounselForm}
              handleCreateCoCounselWorkflow={handleCreateCoCounselWorkflow}
              coCounselMessage={coCounselMessage}
              coCounselWorkflows={coCounselWorkflows}
              handleAcceptCoCounsel={handleAcceptCoCounsel}
              handleDeclineCoCounsel={handleDeclineCoCounsel}
              financeSummary={financeSummary}
              financeModel={financeModel}
              setFinanceModel={setFinanceModel}
              financeMessage={financeMessage}
              financeLoading={financeLoading}
              handleDownloadFinanceUnderwritingPdf={handleDownloadFinanceUnderwritingPdf}
              handleDownloadFinanceDataroom={handleDownloadFinanceDataroom}
              handleStatusUpdate={(status: 'contacted' | 'consulted' | 'retained') => handleStatusUpdate(status)}
              leadDecisionLoading={leadDecisionLoading}
            />
          </Suspense>
        )
      }
      case 'finance': {
        return (
          <Suspense fallback={<AttorneyDashboardPanelSkeleton message="Loading finance tools..." />}>
            <AttorneyDashboardDeferredInlineWorkstream
              sectionKey="finance"
              selectedLead={selectedLead}
              selectedLeadFacts={selectedLeadFacts}
              buildMedicalChronology={buildMedicalChronology}
              caseShareForm={caseShareForm}
              setCaseShareForm={setCaseShareForm}
              handleCreateCaseShare={handleCreateCaseShare}
              caseShareMessage={caseShareMessage}
              caseShares={caseShares}
              currentUserEmail={currentUserEmail}
              currentAttorneyId={currentAttorneyId}
              handleAcceptCaseShare={handleAcceptCaseShare}
              handleDeclineCaseShare={handleDeclineCaseShare}
              referralForm={referralForm}
              setReferralForm={setReferralForm}
              handleCreateReferral={handleCreateReferral}
              referralMessage={referralMessage}
              referrals={referrals}
              handleAcceptReferral={handleAcceptReferral}
              handleDeclineReferral={handleDeclineReferral}
              coCounselForm={coCounselForm}
              setCoCounselForm={setCoCounselForm}
              handleCreateCoCounselWorkflow={handleCreateCoCounselWorkflow}
              coCounselMessage={coCounselMessage}
              coCounselWorkflows={coCounselWorkflows}
              handleAcceptCoCounsel={handleAcceptCoCounsel}
              handleDeclineCoCounsel={handleDeclineCoCounsel}
              financeSummary={financeSummary}
              financeModel={financeModel}
              setFinanceModel={setFinanceModel}
              financeMessage={financeMessage}
              financeLoading={financeLoading}
              handleDownloadFinanceUnderwritingPdf={handleDownloadFinanceUnderwritingPdf}
              handleDownloadFinanceDataroom={handleDownloadFinanceDataroom}
              handleStatusUpdate={(status: 'contacted' | 'consulted' | 'retained') => handleStatusUpdate(status)}
              leadDecisionLoading={leadDecisionLoading}
            />
          </Suspense>
        )
      }
      case 'negotiation':
        return (
          <Suspense fallback={<AttorneyDashboardPanelSkeleton message="Loading negotiation tools..." />}>
            <AttorneyDashboardWorkstreamNegotiation
              negotiationTab={negotiationTab}
              setNegotiationTab={setNegotiationTab}
              negotiationForm={negotiationForm}
              setNegotiationForm={setNegotiationForm}
              handleAddNegotiation={handleAddNegotiation}
              negotiationItems={negotiationItems}
              handleUpdateNegotiationStatus={handleUpdateNegotiationStatus}
              cadenceTemplateForm={cadenceTemplateForm}
              setCadenceTemplateForm={setCadenceTemplateForm}
              cadenceStepForm={cadenceStepForm}
              setCadenceStepForm={setCadenceStepForm}
              handleAddCadenceStep={handleAddCadenceStep}
              handleCreateCadenceTemplate={handleCreateCadenceTemplate}
              cadenceSteps={cadenceSteps}
              negotiationCadenceTemplates={negotiationCadenceTemplates}
              handleDeleteCadenceTemplate={handleDeleteCadenceTemplate}
              leadCommandCenter={leadCommandCenter}
            />
          </Suspense>
        )
      case 'collaboration':
        return (
          <Suspense fallback={<AttorneyDashboardPanelSkeleton message="Loading collaboration tools..." />}>
            <AttorneyDashboardWorkstreamCollaboration
              threadForm={threadForm}
              setThreadForm={setThreadForm}
              handleCreateCommentThread={handleCreateCommentThread}
              commentThreads={commentThreads}
              handleSelectCommentThread={handleSelectCommentThread}
              selectedThreadId={selectedThreadId}
              commentLoading={commentLoading}
              threadComments={threadComments}
              commentMessage={commentMessage}
              setCommentMessage={setCommentMessage}
              handleAddComment={handleAddComment}
              noteForm={noteForm}
              setNoteForm={setNoteForm}
              handleAddNote={handleAddNote}
              noteItems={noteItems}
            />
          </Suspense>
        )
      case 'retainer':
        return (
          <Suspense fallback={<AttorneyDashboardPanelSkeleton message="Loading retainer workflow..." />}>
            <AttorneyDashboardDeferredInlineWorkstream
              sectionKey="retainer"
              selectedLead={selectedLead}
              selectedLeadFacts={selectedLeadFacts}
              buildMedicalChronology={buildMedicalChronology}
              caseShareForm={caseShareForm}
              setCaseShareForm={setCaseShareForm}
              handleCreateCaseShare={handleCreateCaseShare}
              caseShareMessage={caseShareMessage}
              caseShares={caseShares}
              currentUserEmail={currentUserEmail}
              currentAttorneyId={currentAttorneyId}
              handleAcceptCaseShare={handleAcceptCaseShare}
              handleDeclineCaseShare={handleDeclineCaseShare}
              referralForm={referralForm}
              setReferralForm={setReferralForm}
              handleCreateReferral={handleCreateReferral}
              referralMessage={referralMessage}
              referrals={referrals}
              handleAcceptReferral={handleAcceptReferral}
              handleDeclineReferral={handleDeclineReferral}
              coCounselForm={coCounselForm}
              setCoCounselForm={setCoCounselForm}
              handleCreateCoCounselWorkflow={handleCreateCoCounselWorkflow}
              coCounselMessage={coCounselMessage}
              coCounselWorkflows={coCounselWorkflows}
              handleAcceptCoCounsel={handleAcceptCoCounsel}
              handleDeclineCoCounsel={handleDeclineCoCounsel}
              financeSummary={financeSummary}
              financeModel={financeModel}
              setFinanceModel={setFinanceModel}
              financeMessage={financeMessage}
              financeLoading={financeLoading}
              handleDownloadFinanceUnderwritingPdf={handleDownloadFinanceUnderwritingPdf}
              handleDownloadFinanceDataroom={handleDownloadFinanceDataroom}
              handleStatusUpdate={handleStatusUpdate}
              leadDecisionLoading={leadDecisionLoading}
            />
          </Suspense>
        )
      case 'tasks':
        return (
          <Suspense fallback={<AttorneyDashboardPanelSkeleton message="Loading tasks..." />}>
            <AttorneyDashboardWorkstreamTasks
              taskForm={taskForm}
              setTaskForm={setTaskForm}
              handleAddTask={handleAddTask}
              selectedLeadId={selectedLead?.id}
              createLeadSolTask={createLeadSolTask}
              setTaskItems={setTaskItems}
              setError={setError}
              taskItems={taskItems}
              handleToggleTask={handleToggleTask}
              workflowBaseDate={workflowBaseDate}
              setWorkflowBaseDate={setWorkflowBaseDate}
              workflowTemplateForm={workflowTemplateForm}
              setWorkflowTemplateForm={setWorkflowTemplateForm}
              workflowStepForm={workflowStepForm}
              setWorkflowStepForm={setWorkflowStepForm}
              handleAddWorkflowStep={handleAddWorkflowStep}
              handleCreateWorkflowTemplate={handleCreateWorkflowTemplate}
              workflowMessage={workflowMessage}
              workflowSteps={workflowSteps}
              workflowTemplates={workflowTemplates}
              handleApplyWorkflowTemplate={handleApplyWorkflowTemplate}
              handleDeleteWorkflowTemplate={handleDeleteWorkflowTemplate}
              handleCreateTasksFromReadiness={handleCreateTasksFromReadiness}
              leadCommandCenter={leadCommandCenter}
            />
          </Suspense>
        )
      case 'communications':
        return (
          <div className="rounded-md border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Communication Hub</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-gray-500 mb-1">Contact Type</label>
                <select
                  value={contactForm.contactType}
                  onChange={(e) => setContactForm(prev => ({ ...prev, contactType: e.target.value }))}
                  className="input"
                >
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="consult">Consult</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Contact Method</label>
                <input
                  value={contactForm.contactMethod}
                  onChange={(e) => setContactForm(prev => ({ ...prev, contactMethod: e.target.value }))}
                  className="input"
                  placeholder="Phone / Email / Notes"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Scheduled At</label>
                <input
                  type="datetime-local"
                  value={contactForm.scheduledAt}
                  onChange={(e) => setContactForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">Notes</label>
                <input
                  value={contactForm.notes}
                  onChange={(e) => setContactForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="input"
                  placeholder="Outcome / follow-up"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleLogContact}
                disabled={contactLoading}
                className="px-3 py-1.5 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-800 disabled:opacity-50"
              >
                {contactLoading ? 'Saving…' : 'Log Contact'}
              </button>
            </div>
            <div className="mt-4">
              <div className="text-xs text-gray-500 mb-2">Recent Contacts</div>
              {contactHistory.length === 0 ? (
                <div className="text-xs text-gray-500">No contact history yet.</div>
              ) : (
                <div className="space-y-2 text-xs text-gray-700">
                  {contactHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between border border-gray-100 rounded-md px-2 py-1">
                      <div>{item.contactType} • {item.contactMethod || 'N/A'}</div>
                      <div>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      case 'evidence':
        return (
          <Suspense fallback={<AttorneyDashboardPanelSkeleton message="Loading evidence workspace..." />}>
            <AttorneyDashboardWorkstreamEvidence
              selectedLead={selectedLead}
              leadEvidenceFiles={leadEvidenceFiles}
              onOpenEvidenceDashboard={() => {
                const assessmentId = selectedLead.assessment?.id
                if (assessmentId) {
                  navigate(`/evidence-dashboard/${assessmentId}`)
                }
              }}
            />
          </Suspense>
        )
      case 'case-insights':
        return (
          <Suspense fallback={<AttorneyDashboardPanelSkeleton message="Loading case insights..." />}>
            <AttorneyDashboardWorkstreamCaseInsights
              medicalChronology={medicalChronology}
              casePreparation={casePreparation}
              settlementBenchmarks={settlementBenchmarks}
            />
          </Suspense>
        )
      case 'demand':
        return (
          <Suspense fallback={<AttorneyDashboardPanelSkeleton message="Loading demand tools..." />}>
            <AttorneyDashboardWorkstreamDemand
              selectedLead={selectedLead}
              selectedLeadFacts={selectedLeadFacts}
              selectedLeadAnalysis={selectedLeadAnalysis}
              handleDraftDemandLetter={handleDraftDemandLetter}
              handleViewLatestDraft={handleViewLatestDraft}
              handleDownloadDemandDocx={handleDownloadDemandDocx}
              demandDraftLoading={demandDraftLoading}
              demandDraftId={demandDraftId}
              demandDraftMessage={demandDraftMessage}
              demandDraftContent={demandDraftContent}
              leadCommandCenter={leadCommandCenter}
            />
          </Suspense>
        )
      case 'billing':
        return (
          <Suspense fallback={<AttorneyDashboardPanelSkeleton message="Loading billing workspace..." />}>
            <AttorneyDashboardWorkstreamBilling
              invoiceForm={invoiceForm}
              setInvoiceForm={setInvoiceForm}
              handleAddInvoice={handleAddInvoice}
              invoiceItems={invoiceItems}
              handleDownloadInvoicePdf={handleDownloadInvoicePdf}
              handleDownloadInvoiceDocx={handleDownloadInvoiceDocx}
              paymentForm={paymentForm}
              setPaymentForm={setPaymentForm}
              handleAddPayment={handleAddPayment}
              paymentItems={paymentItems}
              handleDownloadPaymentReceipt={handleDownloadPaymentReceipt}
              recurringInvoiceForm={recurringInvoiceForm}
              setRecurringInvoiceForm={setRecurringInvoiceForm}
              handleProcessRecurringInvoices={handleProcessRecurringInvoices}
              handleAddRecurringInvoice={handleAddRecurringInvoice}
              recurringInvoices={recurringInvoices}
            />
          </Suspense>
        )
      case 'insurance':
        return (
          <Suspense fallback={<AttorneyDashboardPanelSkeleton message="Loading insurance records..." />}>
            <AttorneyDashboardWorkstreamInsurance
              insuranceTab={insuranceTab}
              setInsuranceTab={setInsuranceTab}
              insuranceForm={insuranceForm}
              setInsuranceForm={setInsuranceForm}
              handleAddInsurance={handleAddInsurance}
              insuranceItems={insuranceItems}
              lienForm={lienForm}
              setLienForm={setLienForm}
              handleAddLien={handleAddLien}
              lienItems={lienItems}
            />
          </Suspense>
        )
      case 'health':
        return (
          <Suspense fallback={<AttorneyDashboardPanelSkeleton message="Loading case health..." />}>
            <AttorneyDashboardWorkstreamHealth
              handleRefreshHealth={handleRefreshHealth}
              caseHealth={caseHealth}
              healthRuleForm={healthRuleForm}
              setHealthRuleForm={setHealthRuleForm}
              handleAddHealthRule={handleAddHealthRule}
              healthRules={healthRules}
              handleDeleteHealthRule={handleDeleteHealthRule}
              leadCommandCenter={leadCommandCenter}
            />
          </Suspense>
        )
      default:
        return (
          <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-600">
            Select a workstream from the overview to continue.
          </div>
        )
    }
  }

  const activeWorkstream = isLeadSection ? leadSection : workstreamTab

  useEffect(() => {
    if (activeTab !== 'overview') {
      return
    }

    return scheduleIdlePrefetch(() => {
      void loadAttorneyDashboardAnalyticsTab()
      void loadAttorneyDashboardProfileTab()
    })
  }, [activeTab])

  useEffect(() => {
    if (!selectedLead?.id || !isPostAcceptance) {
      return
    }

    const prefetchers = postAcceptanceWorkstreamPrefetchers[activeWorkstream] ?? postAcceptanceWorkstreamPrefetchers.overview
    return scheduleIdlePrefetch(() => {
      prefetchers.forEach((prefetch) => {
        void prefetch()
      })
    })
  }, [activeWorkstream, isPostAcceptance, selectedLead?.id])

  if (loading) {
    return <AttorneyDashboardSkeleton />
  }

  if (error || !dashboardData) {
    return (
      <div className="text-center py-12 px-4">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">Error Loading Dashboard</h3>
        <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">{error || 'Failed to load dashboard data'}</p>
        <div className="mt-6 space-x-4">
          <button
            onClick={() => {
              setError(null)
              loadDashboardData(0)
            }}
            className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors"
          >
            Retry
          </button>
          <button
            onClick={() => window.location.href = '/attorney-preferences'}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Go to Preferences
          </button>
        </div>
        <div className="mt-4 text-xs text-gray-500">
          <p>Check the browser console (F12) for detailed error information.</p>
          <p className="mt-1">If this persists, please contact support with the error details.</p>
        </div>
      </div>
    )
  }

  const attorneyName = dashboardData?.dashboard?.attorney?.name || 
                      dashboardData?.dashboard?.attorney?.profile?.attorney?.name || 
                      'Attorney'
  const unreadPipelineMessages = Object.values(dashboardData?.pipelineMessageCounts ?? {}).reduce(
    (sum, count) => sum + (count || 0),
    0,
  )
  const zeroDocCases = (dashboardData?.recentLeads ?? []).filter((lead: any) => {
    const docCount = lead?.assessment?.evidenceFiles?.length ?? lead?.assessment?.files?.length ?? 0
    return docCount === 0
  }).length
  const followUpCases = dashboardData?.pipelineAlerts?.acceptedNeedsFollowUp ?? 0
  const consultsToday = Math.max(
    dashboardData?.pipelineAlerts?.consultToday ?? 0,
    dashboardData?.upcomingConsults?.length ?? 0,
  )

  return (
    <div className="space-y-8">
      {/* When on a lead URL, show only the lead detail (Pre/Post-Acceptance) */}
      {isLeadSection && selectedLead ? null : (
        <>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Welcome, {attorneyName.split(' ')[0]}!
          </h1>
          <p className="mt-2 text-gray-600">Manage your leads and track performance</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => {
              setActiveTab('leads')
              setTimeout(() => document.getElementById('cases-filters')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
            }}
            className="btn-secondary"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter Leads
          </button>
          <button onClick={() => setActiveTab('leads')} className="btn-primary">
            <Users className="h-4 w-4 mr-2" />
            View All Leads
          </button>
        </div>
      </div>

      {/* Quick Actions - buttons + Today's Events + Contacts */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick actions</h3>
        <div className="flex flex-wrap gap-2 mb-6">
          <Tooltip content="Add new case">
            <button
              onClick={handleAddCaseQuickAction}
              disabled={bulkActionLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100 transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <UserPlus className="h-4 w-4" />
              <span className="text-sm font-medium">Add Case</span>
            </button>
          </Tooltip>
          <Tooltip content="Schedule consultation">
            <button onClick={() => handleQuickAction('scheduleConsult')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100 transition-colors shrink-0">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Add event</span>
              <span className="text-xs text-sky-600">({dashboardData.quickActionCounts?.events ?? 0})</span>
            </button>
          </Tooltip>
          <Tooltip content="Add task to a case">
            <button onClick={() => handleQuickAction('addTask', 'tasks')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100 transition-colors shrink-0">
              <ClipboardList className="h-4 w-4" />
              <span className="text-sm font-medium">Add task</span>
              <span className="text-xs text-sky-600">({dashboardData.quickActionCounts?.tasks ?? 0})</span>
            </button>
          </Tooltip>
          <Tooltip content="Log time for a case">
            <button onClick={() => handleQuickAction('timeEntry')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100 transition-colors shrink-0">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Time entry</span>
              <span className="text-xs text-sky-600">({dashboardData.quickActionCounts?.timeEntries ?? 0})</span>
            </button>
          </Tooltip>
          <Tooltip content="View and add case documents">
            <button onClick={() => handleQuickAction('documents')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors shrink-0">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Document</span>
              <span className="text-xs text-emerald-600">({dashboardData.quickActionCounts?.documents ?? 0})</span>
            </button>
          </Tooltip>
          <Tooltip content="Request documents from plaintiff">
            <button onClick={() => handleQuickAction('documentRequest')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors shrink-0">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Request docs</span>
              <span className="text-xs text-emerald-600">({dashboardData.quickActionCounts?.documentRequests ?? 0})</span>
            </button>
          </Tooltip>
          <Tooltip content="Send message to plaintiff">
            <button onClick={() => handleQuickAction('draftMessage')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors shrink-0">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm font-medium">Draft message</span>
            </button>
          </Tooltip>
          <Tooltip content="Add note to a case">
            <button onClick={() => handleQuickAction('addNote', 'demand')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors shrink-0">
              <StickyNote className="h-4 w-4" />
              <span className="text-sm font-medium">Add note</span>
              <span className="text-xs text-emerald-600">({dashboardData.quickActionCounts?.notes ?? 0})</span>
            </button>
          </Tooltip>
          <Tooltip content="Add expense / lien">
            <button onClick={() => handleQuickAction('addExpense', 'insurance')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors shrink-0">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">Add expense</span>
              <span className="text-xs text-amber-600">({dashboardData.quickActionCounts?.expenses ?? 0})</span>
            </button>
          </Tooltip>
          <Tooltip content="Create invoice for case">
            <button onClick={() => handleQuickAction('createInvoice', 'billing')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors shrink-0">
              <Receipt className="h-4 w-4" />
              <span className="text-sm font-medium">Create invoice</span>
              <span className="text-xs text-amber-600">({dashboardData.quickActionCounts?.invoices ?? 0})</span>
            </button>
          </Tooltip>
          <Tooltip content="View today's events and schedule">
            <button onClick={() => navigate('/attorney-dashboard/events')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100 transition-colors shrink-0">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Today&apos;s events</span>
              <span className="text-xs text-sky-600">({dashboardData.quickActionCounts?.events ?? 0})</span>
            </button>
          </Tooltip>
          <Tooltip content="View calendar">
            <button onClick={() => navigate('/attorney-dashboard/calendar')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100 transition-colors shrink-0">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Calendar</span>
            </button>
          </Tooltip>
          <Tooltip content="View and manage contacts">
            <button onClick={() => navigate('/attorney-dashboard/contacts')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100 transition-colors shrink-0">
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">Contacts</span>
              <span className="text-xs text-brand-600">({dashboardData.caseContactsCount ?? 0})</span>
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Calendar sync</h3>
            <p className="mt-1 text-sm text-gray-600">
              Sync your primary Google or Microsoft calendar so plaintiffs only see current consultation openings.
            </p>
          </div>
          <button
            onClick={() => void loadCalendarConnections()}
            disabled={calendarConnectionsLoading}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Refresh
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {calendarHealthSummary && (
            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                  {calendarHealthSummary.connectedCount}/{calendarHealthSummary.totalConnections} connected
                </span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                  {calendarHealthSummary.healthyCount} healthy
                </span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                  {calendarHealthSummary.warningCount} warning
                </span>
                <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">
                  {calendarHealthSummary.errorCount} error
                </span>
              </div>
            </div>
          )}
          {(['google', 'microsoft'] as const).map((provider) => {
            const connection = calendarConnections.find((item) => item.provider === provider)
            const providerLabel = provider === 'google' ? 'Google Calendar' : 'Microsoft Outlook'
            const actionLoading = calendarActionProvider === provider
            const healthTone =
              connection?.health?.status === 'healthy'
                ? 'bg-emerald-100 text-emerald-700'
                : connection?.health?.status === 'warning'
                  ? 'bg-amber-100 text-amber-700'
                  : connection?.health?.status === 'error'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-slate-200 text-slate-700'
            return (
              <div key={provider} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{providerLabel}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {connection?.connected
                        ? `${connection.externalAccountEmail || 'Connected'}${connection.lastSyncedAt ? ` • synced ${new Date(connection.lastSyncedAt).toLocaleString()}` : ''}`
                        : 'Not connected'}
                    </p>
                    {connection?.connected && (
                      <p className={`mt-1 text-xs ${connection.autoSyncEnabled ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {connection.autoSyncEnabled
                          ? `Auto-sync active${connection.webhookExpiresAt ? ` until ${new Date(connection.webhookExpiresAt).toLocaleString()}` : ''}`
                          : 'Auto-sync is not active yet. Manual sync still works.'}
                      </p>
                    )}
                    {connection?.lastWebhookAt && (
                      <p className="mt-1 text-xs text-slate-500">
                        Last webhook: {new Date(connection.lastWebhookAt).toLocaleString()}
                      </p>
                    )}
                    {connection?.lastSyncError && (
                      <p className="mt-1 text-xs text-amber-700">{connection.lastSyncError}</p>
                    )}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${healthTone}`}>
                    {connection?.health?.status
                      ? connection.health.status.charAt(0).toUpperCase() + connection.health.status.slice(1)
                      : connection?.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                {connection?.health && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span>{connection.health.busyBlockCount} busy block(s) synced</span>
                      <span>Recommendation: {connection.health.recommendedAction}</span>
                    </div>
                    {connection.health.issues.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {connection.health.issues.map((issue) => (
                          <p key={issue} className="text-xs text-slate-600">
                            {issue}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => void handleConnectCalendar(provider)}
                    disabled={actionLoading}
                    className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    {connection?.connected ? 'Reconnect' : 'Connect'}
                  </button>
                  {connection?.connected && (
                    <>
                      <button
                        onClick={() => void handleSyncCalendarConnection(provider)}
                        disabled={actionLoading}
                        className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-60"
                      >
                        Sync now
                      </button>
                      <button
                        onClick={() => void handleDisconnectCalendarConnection(provider)}
                        disabled={actionLoading}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                      >
                        Disconnect
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Communications - always visible, badge when unread */}
      <div
        className="card border-2 border-brand-100 bg-brand-50/30 cursor-pointer hover:bg-brand-50/50 flex items-center justify-between"
        onClick={() => { setActiveTab('leads'); document.getElementById('cases-filters')?.scrollIntoView({ behavior: 'smooth' }) }}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <MessageSquare className="h-5 w-5 text-brand-600" />
            {(dashboardData.messagingSummary?.unreadCount ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                {Math.min(99, dashboardData.messagingSummary!.unreadCount)}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Communications</h3>
            <p className="text-sm text-gray-600">
              {(dashboardData.messagingSummary?.unreadCount ?? 0) > 0 ? (
                <span className="font-semibold text-brand-700">{dashboardData.messagingSummary?.unreadCount ?? 0} unread</span>
              ) : (dashboardData.messagingSummary?.awaitingResponseCount ?? 0) > 0 ? (
                <span className="text-amber-700">{dashboardData.messagingSummary?.awaitingResponseCount ?? 0} awaiting response</span>
              ) : (
                'No new messages'
              )}
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
      </div>

      {/* Section 1: New Case Matches - compact when empty, expands with matches */}
      {(() => {
        const matchCount = dashboardData.newCaseMatches?.length ?? 0
        const hasMatches = matchCount > 0
        return (
      <div className={`rounded-lg border border-brand-200 bg-white shadow-sm overflow-hidden ${hasMatches ? '' : ''}`}>
        <div className={`bg-brand-600 px-4 py-2 flex items-center justify-between ${hasMatches ? 'py-3' : ''}`}>
          <h2 className="text-base font-semibold text-white">
            New Case Matches ({matchCount})
          </h2>
          {hasMatches && <p className="text-brand-100 text-xs">Your highest-priority cases</p>}
        </div>
        <div className={hasMatches ? 'p-4 space-y-3' : 'px-4 py-3'}>
        {hasMatches ? (
          <div className="space-y-3">
            {dashboardData.newCaseMatches!.slice(0, 5).map((lead: any) => {
              const preds = lead.assessment?.predictions || []
              const predObj = Array.isArray(preds) ? preds[0] : preds
              let viability = 0
              let bands: any = {}
              if (predObj?.viability) {
                try {
                  const v = typeof predObj.viability === 'string' ? JSON.parse(predObj.viability) : predObj.viability
                  viability = (v.overall ?? 0) * 100
                } catch {}
              }
              if (predObj?.bands) {
                try {
                  bands = typeof predObj.bands === 'string' ? JSON.parse(predObj.bands) : predObj.bands
                } catch {}
              }
              const low = bands.low ?? bands.p25 ?? 0
              const high = bands.high ?? bands.p75 ?? bands.median ?? 0
              const claimLabel = (lead.assessment?.claimType || 'Case').replace(/_/g, ' ')
              const location = [lead.assessment?.venueCounty, lead.assessment?.venueState].filter(Boolean).join(', ') || '—'
              const files = lead.assessment?.evidenceFiles ?? lead.assessment?.files ?? []
              const evidenceTags = []
              if (files.some((f: any) => f?.category === 'medical' || f?.mimetype?.includes('pdf'))) evidenceTags.push('Medical')
              if (files.some((f: any) => f?.category === 'photos' || f?.mimetype?.includes('image'))) evidenceTags.push('Photos')
              const evidenceStr = evidenceTags.length > 0 ? evidenceTags.join(' + ') : 'Pending'
              return (
                <div
                  key={lead.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-brand-100 bg-brand-50/30 hover:bg-brand-50/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 capitalize">{claimLabel} — {location}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Estimated Value: {formatCurrency(low)}–{formatCurrency(high)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Evidence: {evidenceStr}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => navigate(`/attorney-dashboard/lead/${lead.id}/overview`)}
                      className="px-4 py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50"
                    >
                      Review Case
                    </button>
                    {lead.status !== 'submitted' && (
                      <button
                        onClick={() => navigate(`/attorney-dashboard/lead/${lead.id}/overview`)}
                        className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700"
                      >
                        Contact Plaintiff
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 text-sm">
            <p className="text-gray-500">No new case matches yet. We&apos;ll notify you when a case matches your practice area.</p>
            {dashboardData.recentLeads?.[0]?.submittedAt && (
              <span className="text-xs text-gray-400 shrink-0">Last match: {getHoursAgo(dashboardData.recentLeads[0].submittedAt)}h ago</span>
            )}
          </div>
        )}
        </div>
      </div>
        )
      })()}

      {/* Section 2: Pipeline Value (top) + Pipeline Conversion + Active Cases */}
      <div className="space-y-6">
        {/* Pipeline Value - prominent at top */}
        <div className="card border-2 border-emerald-100 bg-emerald-50/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">Pipeline Value</h3>
              <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{formatCurrency(dashboardData.pipelineValue ?? 0)} <span className="text-base font-normal text-slate-500 dark:text-slate-400">potential fees</span></p>
            </div>
            {(dashboardData.casesRequiringAttention ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">{dashboardData.casesRequiringAttention} cases require attention</span>
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Conversion - analytics */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Pipeline Conversion</h3>
          <p className="text-sm text-gray-500 mb-4">Matched → Accepted → Contacted → Consult → Retained</p>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
            {[
              { key: 'matched', label: 'Matched', count: dashboardData.funnel?.matched ?? 0, pct: null },
              { key: 'accepted', label: 'Accepted', count: dashboardData.funnel?.accepted ?? 0, pct: (dashboardData.funnel?.matched ?? 0) > 0 ? Math.round(((dashboardData.funnel?.accepted ?? 0) / (dashboardData.funnel?.matched ?? 1)) * 100) : null },
              { key: 'contacted', label: 'Contacted', count: dashboardData.funnel?.contacted ?? 0, pct: (dashboardData.funnel?.accepted ?? 0) > 0 ? Math.round(((dashboardData.funnel?.contacted ?? 0) / ((dashboardData.funnel?.accepted ?? 0) || 1)) * 100) : null },
              { key: 'consultScheduled', label: 'Consult', count: dashboardData.funnel?.consultScheduled ?? 0, pct: (dashboardData.funnel?.contacted ?? 0) > 0 ? Math.round(((dashboardData.funnel?.consultScheduled ?? 0) / ((dashboardData.funnel?.contacted ?? 0) || 1)) * 100) : null },
              { key: 'retained', label: 'Retained', count: dashboardData.funnel?.retained ?? 0, pct: (dashboardData.funnel?.consultScheduled ?? 0) > 0 ? Math.round(((dashboardData.funnel?.retained ?? 0) / ((dashboardData.funnel?.consultScheduled ?? 0) || 1)) * 100) : null },
              { key: 'closed', label: 'Closed', count: dashboardData.funnel?.closed ?? 0, pct: null }
            ].map(({ key, label, count, pct }) => (
              <button
                key={key}
                type="button"
                onClick={() => handlePipelineTileClick(key as any)}
                className={`rounded-lg border border-gray-200 p-3 text-center transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                  activePipelineTile === key ? 'ring-2 ring-brand-500 ring-offset-2' : ''
                }`}
                title={`Filter to ${label} cases`}
              >
                <div className="text-xl font-bold text-gray-900">{count}</div>
                <div className="text-gray-600 text-xs mt-0.5">{label}</div>
                {pct != null && <div className="text-xs text-brand-600 mt-0.5">({pct}%)</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Active Cases - 6 cards in flow, clickable, no buttons */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Active Cases</h3>
          <p className="text-sm text-gray-500 mb-4">Matched → Accepted → Contacted → Consult → Retained → Closed</p>
          {(() => {
            const pipelineAlerts = dashboardData.pipelineAlerts ?? {}
            const pipelineMessageCounts = dashboardData.pipelineMessageCounts ?? {}
            return (
          <div className="flex flex-wrap items-stretch gap-2">
            {[
              { key: 'matched', label: 'Matched', count: dashboardData.activeCases?.matched ?? 0, color: 'violet', alert: (pipelineAlerts.matchedExpiringSoon ?? 0) > 0 ? `⚠ ${pipelineAlerts.matchedExpiringSoon} expiring soon` : (pipelineMessageCounts.matched ?? 0) > 0 ? `📩 ${pipelineMessageCounts.matched} new message` : null, previews: dashboardData.pipelinePreviews?.matched },
              { key: 'accepted', label: 'Accepted', count: dashboardData.activeCases?.accepted ?? 0, color: 'amber', alert: (pipelineAlerts.acceptedNeedsFollowUp ?? 0) > 0 ? `⚠ ${pipelineAlerts.acceptedNeedsFollowUp} needs follow-up` : (pipelineMessageCounts.accepted ?? 0) > 0 ? `📩 ${pipelineMessageCounts.accepted} new message` : null, previews: dashboardData.pipelinePreviews?.accepted },
              { key: 'contacted', label: 'Contacted', count: dashboardData.activeCases?.contacted ?? 0, color: 'blue', alert: (pipelineMessageCounts.contacted ?? 0) > 0 ? `📩 ${pipelineMessageCounts.contacted} new message` : null, previews: dashboardData.pipelinePreviews?.contacted },
              { key: 'consultScheduled', label: 'Consult', count: dashboardData.activeCases?.consultScheduled ?? 0, color: 'sky', alert: (pipelineAlerts.consultToday ?? 0) > 0 ? `📅 ${pipelineAlerts.consultToday} today` : (pipelineMessageCounts.consultScheduled ?? 0) > 0 ? `📩 ${pipelineMessageCounts.consultScheduled} new message` : null, previews: dashboardData.pipelinePreviews?.consultScheduled },
              { key: 'retained', label: 'Retained', count: dashboardData.activeCases?.retained ?? 0, color: 'emerald', alert: dashboardData.retainedValue ? `$${Math.round((dashboardData.retainedValue ?? 0) / 1000)}K` : (pipelineMessageCounts.retained ?? 0) > 0 ? `📩 ${pipelineMessageCounts.retained} new message` : null, previews: dashboardData.pipelinePreviews?.retained },
              { key: 'closed', label: 'Closed', count: dashboardData.activeCases?.closed ?? 0, color: 'gray', alert: null, previews: [] }
            ].map(({ key, label, count, color, alert, previews }, i) => {
              const isActive = activePipelineTile === key
              const colorClasses: Record<string, string> = {
                violet: 'bg-violet-50 border-violet-200 hover:bg-violet-100 text-violet-700',
                amber: 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-700',
                blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700',
                sky: 'bg-sky-50 border-sky-200 hover:bg-sky-100 text-sky-700',
                emerald: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-700',
                gray: 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-700'
              }
              return (
                <div key={key} className="flex items-center">
                  {i > 0 && <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 mx-0.5" />}
                  <div
                    onClick={() => handlePipelineTileClick(key as any)}
                    className={`relative flex-1 min-w-[90px] max-w-[140px] rounded-xl border p-3 text-center cursor-pointer transition-all duration-200 group shadow-sm hover:shadow-md motion-reduce:transition-none ${colorClasses[color]} ${isActive ? 'ring-2 ring-offset-1 ring-brand-500 dark:ring-brand-400 dark:ring-offset-slate-950' : ''}`}
                    title={`Filter to ${label} cases`}
                  >
                    <div className="text-lg font-bold tabular-nums">{count}</div>
                    <div className="text-xs font-medium opacity-90">{label}</div>
                    {alert && <div className="mt-1 text-[10px] truncate">{alert}</div>}
                    {previews && previews.length > 0 && (
                      <div className="absolute left-full top-0 ml-2 z-20 hidden group-hover:block w-52 p-2 rounded-lg shadow-lg bg-white border border-gray-200 text-left">
                        {previews.slice(0, 2).map((p: any) => (
                          <div key={p.id} className="text-xs text-gray-600 py-1 border-b border-gray-100 last:border-0">
                            <span className="font-medium">{(p.claimType || 'Case').replace(/_/g, ' ')}</span>
                            {p.venue && <span> — {p.venue}</span>}
                            {p.estimatedValue != null && <span><br />Est: {formatCurrency(p.estimatedValue)}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
            )
          })()}
        </div>
      </div>

      {/* Section 3: Revenue Overview */}
      <div className="card border-2 border-emerald-100 bg-emerald-50/30">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500">Total Fees Collected</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(dashboardData.dashboard.feesCollectedFromPayments)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Platform Spend</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(dashboardData.dashboard.totalPlatformSpend)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Net Revenue</p>
            <p className="text-xl font-bold text-emerald-700">{formatCurrency(Math.max(0, dashboardData.dashboard.feesCollectedFromPayments - dashboardData.dashboard.totalPlatformSpend))}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">ROI</p>
            <p className="text-xl font-bold text-emerald-700">{formatPercentage((dashboardData.analytics.roi || 0) * 100)}</p>
          </div>
        </div>
      </div>

      {/* Section 4: Top Opportunity Today */}
      {dashboardData.topCaseToday && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-200">
            <h2 className="text-lg font-bold text-gray-900">Top Opportunity Today</h2>
            <p className="text-sm text-amber-800">Best opportunity by expected value × viability</p>
          </div>
          {(() => {
            const lead = dashboardData.topCaseToday
            const pred = lead.assessment?.predictions?.[0] || lead.assessment?.predictions
            const predObj = Array.isArray(pred) ? pred[0] : pred
            let viability = 0
            let bands: any = {}
            if (predObj?.viability) {
              try {
                const v = typeof predObj.viability === 'string' ? JSON.parse(predObj.viability) : predObj.viability
                viability = (v.overall ?? 0) * 100
              } catch {}
            }
            if (predObj?.bands) {
              try {
                bands = typeof predObj.bands === 'string' ? JSON.parse(predObj.bands) : predObj.bands
              } catch {}
            }
            const low = bands.low ?? bands.p25 ?? 0
            const high = bands.high ?? bands.p75 ?? bands.median ?? 0
            const claimLabel = (lead.assessment?.claimType || 'Case').replace(/_/g, ' ')
            const location = [lead.assessment?.venueCounty, lead.assessment?.venueState].filter(Boolean).join(', ') || '—'
            return (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
                <div>
                  <p className="font-semibold text-gray-900 capitalize">{claimLabel} — {location}</p>
                  <p className="text-sm text-gray-600 mt-1">Estimated Value: {formatCurrency(low)}–{formatCurrency(high)}</p>
                  <p className="text-sm text-brand-600 font-medium">Case Score: {Math.round(viability)}</p>
                </div>
                <button
                  onClick={() => navigate(`/attorney-dashboard/lead/${lead.id}/overview`)}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 shrink-0"
                >
                  Review Case
                </button>
              </div>
            )
          })()}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-4">
          {([
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'leads', name: 'Cases', icon: Users },
            { id: 'analytics', name: 'Analytics', icon: TrendingUp },
            { id: 'intake', name: 'Intake & Imports', icon: Upload },
            { id: 'profile', name: 'Profile', icon: User }
          ] as const).map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-brand-500 text-brand-600'
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
          <div className="sticky top-4 z-10 rounded-2xl border border-brand-200 bg-white/95 p-4 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Today command center</h3>
                <p className="mt-1 text-sm text-gray-600">Jump straight into high-priority work, follow-up, consults, and missing-document cleanup.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openLeadQueue({ status: 'submitted', pipelineStage: 'matched' }, { pipelineTile: 'matched' })}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
                >
                  {dashboardData.dailyQueueSummary?.highSeverity ?? 0} review now
                </button>
                <button
                  type="button"
                  onClick={() => openLeadQueue({ status: 'contacted', pipelineStage: 'accepted' }, { pipelineTile: 'accepted' })}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100"
                >
                  {followUpCases} follow-up due
                </button>
                <button
                  type="button"
                  onClick={() => setConsultCalendarModalOpen(true)}
                  className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-100"
                >
                  {consultsToday} consults today
                </button>
                <button
                  type="button"
                  onClick={() => openLeadQueue({ evidenceLevel: 'none' })}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                >
                  {zeroDocCases} missing docs
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('leads')}
                  className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-100"
                >
                  {unreadPipelineMessages} unread messages
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Needs action today</h3>
                <p className="mt-1 text-sm text-gray-600">Prioritized work across follow-up, document blockers, consult prep, and demand readiness.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                  {dashboardData.dailyQueueSummary?.highSeverity ?? 0} high priority
                </span>
                <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                  {dashboardData.dailyQueueSummary?.mediumSeverity ?? 0} medium priority
                </span>
                <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                  {dashboardData.dailyQueueSummary?.demandReady ?? 0} demand-ready
                </span>
              </div>
            </div>

            {(dashboardData.needsActionToday?.length ?? 0) > 0 ? (
              <div className="mt-5 grid gap-3">
                {(dashboardData.needsActionToday ?? []).map((item) => (
                  <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            item.severity === 'high'
                              ? 'bg-red-100 text-red-700'
                              : item.severity === 'medium'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                          }`}>
                            {item.severity}
                          </span>
                          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{item.claimType}</span>
                          <span className="text-xs text-gray-500">{item.plaintiffName}</span>
                        </div>
                        <h4 className="mt-2 text-sm font-semibold text-gray-900">{item.title}</h4>
                        <p className="mt-1 text-sm text-gray-600">{item.detail}</p>
                        {item.dueAt ? (
                          <p className="mt-2 text-xs text-gray-500">Due: {new Date(item.dueAt).toLocaleString()}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => handleDailyQueueAction(item)}
                          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
                        >
                          {item.actionLabel}
                        </button>
                        <button
                          onClick={() => navigate(`/attorney-dashboard/lead/${item.leadId}/overview`)}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Open case
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                No urgent work is queued right now. Demand-ready files and follow-ups will appear here automatically.
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Automation feed</h3>
                <p className="mt-1 text-sm text-gray-600">Readiness-generated reminders and nudges the system queued automatically.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {dashboardData.automationFeed?.length ?? 0} queued
                </span>
                <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                  {(dashboardData.automationFeed || []).filter((item) => item.severity === 'high').length} high severity
                </span>
                <span className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
                  {new Set((dashboardData.automationFeed || []).map((item) => item.category)).size} groups
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'All', count: automationFeedFilterCounts.all },
                { id: 'high', label: 'High severity', count: automationFeedFilterCounts.high },
                { id: 'resolved', label: 'Resolved', count: automationFeedFilterCounts.resolved },
                { id: 'due_today', label: 'Due today', count: automationFeedFilterCounts.due_today },
              ].map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setAutomationFeedFilter(filter.id as 'all' | 'high' | 'resolved' | 'due_today')}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    automationFeedFilter === filter.id
                      ? 'border-brand-300 bg-brand-50 text-brand-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {filter.label} {filter.count}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500" htmlFor="automation-feed-sort">
                  Sort
                </label>
                <select
                  id="automation-feed-sort"
                  value={automationFeedSort}
                  onChange={(event) => setAutomationFeedSort(event.target.value as 'due_asc' | 'recent' | 'severity')}
                  className="select min-w-[180px] py-2 text-sm"
                >
                  <option value="due_asc">Due soonest</option>
                  <option value="recent">Recently updated</option>
                  <option value="severity">Highest severity</option>
                </select>
                <span className="text-xs text-gray-500">
                  Showing {filteredAutomationFeed.length} item{filteredAutomationFeed.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={filteredAutomationFeed.length === 0}
                  onClick={() => handleBulkOpenAutomationFeedItems(filteredAutomationFeed)}
                  className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Open all visible
                </button>
                <button
                  type="button"
                  disabled={visibleResolvedAutomationFeedCount === 0}
                  onClick={() => void handleDismissResolvedAutomationFeedGroup(filteredAutomationFeed)}
                  className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Dismiss all resolved
                </button>
              </div>
            </div>

            {automationFeedGroups.length > 0 ? (
              <div className="mt-5 space-y-5">
                {automationFeedGroups.map(([category, items]) => {
                  const label = category.replace(/_/g, ' ')
                  const highSeverityCount = items.filter((item) => item.severity === 'high').length
                  const resolvedCount = items.filter((item) => isAutomationFeedResolved(item)).length
                  return (
                    <div key={category} className="rounded-xl border border-gray-200 bg-white">
                      <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h4 className="text-sm font-semibold capitalize text-gray-900">{label}</h4>
                          <p className="text-xs text-gray-500">{items.length} queued item{items.length === 1 ? '' : 's'}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {items.length} total
                          </span>
                          <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                            {highSeverityCount} high
                          </span>
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            {resolvedCount} resolved
                          </span>
                          <button
                            type="button"
                            disabled={items.length === 0}
                            onClick={() => handleBulkOpenAutomationFeedItems(items)}
                            className="rounded-full border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Open all
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleBulkSnoozeAutomationFeedGroup(items, 1)}
                            className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                          >
                            Snooze all 1 day
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleBulkSnoozeAutomationFeedGroup(items, 3)}
                            className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                          >
                            Snooze all 3 days
                          </button>
                          <button
                            type="button"
                            disabled={resolvedCount === 0}
                            onClick={() => void handleDismissResolvedAutomationFeedGroup(items)}
                            className="rounded-full border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Dismiss resolved
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3 p-4">
                        {items.map((item) => (
                          <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                    item.severity === 'high'
                                      ? 'bg-red-100 text-red-700'
                                      : item.severity === 'medium'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {item.severity}
                                  </span>
                                  <span className="text-xs text-gray-500">{item.plaintiffName}</span>
                                  {isAutomationFeedResolved(item) ? (
                                    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                      resolved
                                    </span>
                                  ) : null}
                                </div>
                                <h4 className="mt-2 text-sm font-semibold text-gray-900">{item.title}</h4>
                                <p className="mt-1 text-sm text-gray-600">{item.detail}</p>
                                <p className="mt-2 text-xs text-gray-500">
                                  Due: {new Date(item.dueAt).toLocaleString()} • {item.claimType}
                                </p>
                                {item.activityTrail?.length ? (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {item.activityTrail.map((event, index) => (
                                      <span
                                        key={`${event.label}-${event.at}-${index}`}
                                        className="inline-flex rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600"
                                      >
                                        {event.label} {new Date(event.at).toLocaleString()}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center gap-2">
                                <button
                                  onClick={() => handleAutomationFeedAction(item)}
                                  className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
                                >
                                  {item.actionLabel}
                                </button>
                                <button
                                  onClick={() => navigate(`/attorney-dashboard/lead/${item.leadId}/overview`)}
                                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                  Open case
                                </button>
                                <button
                                  onClick={() => void handleSnoozeAutomationFeedItem(item, 1)}
                                  className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
                                >
                                  Snooze 1 day
                                </button>
                                <button
                                  onClick={() => void handleSnoozeAutomationFeedItem(item, 3)}
                                  className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
                                >
                                  Snooze 3 days
                                </button>
                                <button
                                  onClick={() => void handleDismissAutomationFeedItem(item)}
                                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                  Dismiss
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                {automationFeedFilter === 'all'
                  ? 'No automation items are queued right now. New readiness reminders will appear here as the system detects blockers or demand-ready files.'
                  : 'No automation items match the current filter.'}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lead Quality */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Quality</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average Case Score</span>
                  <span className="font-semibold">{Math.round((dashboardData.qualityMetrics.averageViability || 0) * 100)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average Case Value</span>
                  <span className="font-semibold">{formatCurrency(dashboardData.analytics.averageFee || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Evidence Complete</span>
                  <span className="font-semibold text-green-600">{dashboardData.qualityMetrics?.evidenceComplete ?? 0}%</span>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
              <div className="space-y-3 text-sm">
                {dashboardData.newCaseMatches?.length ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-brand-50 text-brand-800">
                    <span className="font-medium">New case matched</span>
                  </div>
                ) : null}
                {dashboardData.recentLeads?.some((l: any) => l.status === 'contacted' || l.status === 'consulted') && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 text-amber-800">
                    <span className="font-medium">Leads awaiting follow-up</span>
                  </div>
                )}
                {(!dashboardData.newCaseMatches?.length && !dashboardData.recentLeads?.some((l: any) => l.status === 'contacted' || l.status === 'consulted')) ? (
                  <p className="text-gray-500">No new notifications</p>
                ) : null}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => openLeadQueue({ status: 'submitted', pipelineStage: 'matched' }, { pipelineTile: 'matched' })}
                  className="w-full px-4 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700"
                >
                  Review New Cases
                </button>
                {dashboardData.newCaseMatches?.[0] && (
                  <button
                    onClick={() => {
                      const firstHotLead = dashboardData.newCaseMatches?.[0]
                      if (firstHotLead) {
                        navigate(`/attorney-dashboard/lead/${firstHotLead.id}/overview`)
                      }
                    }}
                    className="w-full px-4 py-2.5 text-sm font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50"
                  >
                    <Phone className="h-4 w-4 inline mr-2" />
                    Call Hot Lead
                  </button>
                )}
                {dashboardData.topCaseToday && (
                  <button
                    onClick={() => navigate(`/attorney-dashboard/lead/${dashboardData.topCaseToday.id}/overview`)}
                    className="w-full px-4 py-2.5 text-sm font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50"
                  >
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Schedule Consultation
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('intake')}
                  className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4 inline mr-2" />
                  Upload Case File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'intake' && (
        <Suspense fallback={<AttorneyDashboardPanelSkeleton message="Loading intake tools..." />}>
          <AttorneyDashboardIntakeTab onGoToLeads={() => setActiveTab('leads')} />
        </Suspense>
      )}

      {activeTab === 'leads' && (
        <Suspense fallback={<AttorneyDashboardPanelSkeleton message="Loading cases..." />}>
          <AttorneyDashboardLeadsTab
            activePipelineTile={activePipelineTile}
            bulkActionLoading={bulkActionLoading}
            bulkActionMessage={bulkActionMessage}
            caseLeadsFilter={caseLeadsFilter}
            dashboardData={dashboardData}
            formatCurrency={formatCurrency}
            onAcceptLead={(leadId) => handleLeadDecision(leadId, 'accept')}
            onDeclineLead={(leadId) => handleLeadDecision(leadId, 'reject')}
            onHandleQuickActionForLead={handleQuickActionForLead}
            onOpenDocumentRequest={handleOpenDocumentRequest}
            onOpenLead={(lead) => {
              setSelectedLead(lead)
              const isPost = ['contacted', 'consulted', 'retained'].includes(lead.status || '')
              setLeadPhaseTab(isPost ? 'post' : 'pre')
              navigate(`/attorney-dashboard/lead/${lead.id}/overview`)
            }}
            onOpenLeadChat={(lead) => {
              setSelectedLead(lead)
              setChatDrawerOpen(true)
              navigate(`/attorney-dashboard/lead/${lead.id}/overview`)
            }}
            onOpenScheduleConsult={handleOpenScheduleConsult}
            pendingQuickAction={pendingQuickAction}
            selectedLeadIds={selectedLeadIds}
            setActivePipelineTile={setActivePipelineTile}
            setCaseLeadsFilter={setCaseLeadsFilter}
            setPendingQuickAction={setPendingQuickAction}
            setSelectedLeadIds={setSelectedLeadIds}
            setStarredLeadIds={setStarredLeadIds}
            starredLeadIds={starredLeadIds}
          />
        </Suspense>
      )}

      {activeTab === 'analytics' && (
        <Suspense fallback={<AttorneyDashboardPanelSkeleton message="Loading analytics..." />}>
          <AttorneyDashboardAnalyticsTab
            dashboardData={dashboardData}
            decisionSummary={decisionSummary}
            analyticsIntel={analyticsIntel}
            profile={profile}
          />
        </Suspense>
      )}

      {activeTab === 'profile' && (
        <Suspense fallback={<AttorneyDashboardPanelSkeleton message="Loading profile settings..." />}>
          <AttorneyDashboardProfileTab
            error={error}
            profileLoading={profileLoading}
            profile={profile}
            editing={editing}
            setEditing={setEditing}
            setProfile={setProfile}
            handleSaveProfile={handleSaveProfile}
            negotiationStyle={negotiationStyle}
            setNegotiationStyle={setNegotiationStyle}
            riskTolerance={riskTolerance}
            setRiskTolerance={setRiskTolerance}
            handleSaveDecisionProfile={handleSaveDecisionProfile}
            decisionProfileLoading={decisionProfileLoading}
            licenseStatus={licenseStatus}
            licenseSuccess={licenseSuccess}
            licenseError={licenseError}
            setLicenseError={setLicenseError}
            licenseLoading={licenseLoading}
            licenseMethod={licenseMethod}
            setLicenseMethod={setLicenseMethod}
            licenseNumber={licenseNumber}
            setLicenseNumber={setLicenseNumber}
            licenseState={licenseState}
            setLicenseState={setLicenseState}
            selectedLicenseFile={selectedLicenseFile}
            handleStateBarLookup={handleStateBarLookup}
            handleLicenseFileUpload={handleLicenseFileUpload}
            handleLicenseFileChange={handleLicenseFileChange}
          />
        </Suspense>
      )}

        </>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <Suspense fallback={<AttorneyDashboardPanelSkeleton message="Opening case workspace..." />}>
          <AttorneyDashboardLeadDetail
            selectedLead={selectedLead}
            isLeadSection={isLeadSection}
            isPostAcceptance={isPostAcceptance}
            leadWrapperClass={leadWrapperClass}
            leadContainerClass={leadContainerClass}
            onBackToOverview={() => navigate('/attorney-dashboard')}
            onClose={() => {
              if (isLeadSection) {
                navigate('/attorney-dashboard')
              }
              setSelectedLead(null)
            }}
            handleDownloadCaseFile={handleDownloadCaseFile}
            caseFileLoading={caseFileLoading}
            currentAttorneyId={currentAttorneyId}
            firmAttorneys={firmAttorneys}
            transferAttorneyId={transferAttorneyId}
            setTransferAttorneyId={setTransferAttorneyId}
            handleTransferLead={handleTransferLead}
            transferLoading={transferLoading}
            transferMessage={transferMessage}
            leadPhaseTab={leadPhaseTab}
            setLeadPhaseTab={setLeadPhaseTab}
            selectedLeadFacts={selectedLeadFacts}
            selectedLeadPrediction={selectedLeadPrediction}
            selectedLeadAnalysis={selectedLeadAnalysis}
            summarizeNarrative={summarizeNarrative}
            formatRelativeDate={formatRelativeDate}
            getTreatmentContinuity={getTreatmentContinuity}
            buildMedicalChronology={buildMedicalChronology}
            getConfidenceBand={getConfidenceBand}
            getConfidenceScore={getConfidenceScore}
            getKeyDrivers={getKeyDrivers}
            getSeverityScore={getSeverityScore}
            getAdjusterPrediction={getAdjusterPrediction}
            analyticsIntel={analyticsIntel}
            dashboardData={dashboardData}
            leadEvidenceFiles={leadEvidenceFiles}
            profile={profile}
            handleLeadDecision={handleLeadDecision}
            setDeclineLeadId={setDeclineLeadId}
            setDeclineModalOpen={setDeclineModalOpen}
            leadDecisionLoading={leadDecisionLoading}
            activeWorkstream={activeWorkstream}
            workstreamTab={workstreamTab}
            renderWorkstream={renderWorkstream}
            contactHistory={contactHistory}
            handleQuickCall={handleQuickCall}
            handleQuickMessage={handleQuickMessage}
            handleQuickConsult={handleQuickConsult}
            handleCreateContactFromCommand={handleCreateContactFromCommand}
            setChatDrawerOpen={setChatDrawerOpen}
            reloadContacts={reloadContacts}
            handleDraftDemandLetter={handleDraftDemandLetter}
            demandDraftLoading={demandDraftLoading}
            setWorkstreamTab={setWorkstreamTab}
            negotiationItems={negotiationItems}
            invoiceItems={invoiceItems}
            leadCommandCenter={leadCommandCenter}
            leadCommandCenterLoading={leadCommandCenterLoading}
            handleReviewSuggestedRequest={handleReviewSuggestedRequest}
            handleOpenSuggestedRequestPage={handleOpenSuggestedRequestPage}
            handleDraftPlaintiffUpdate={handleDraftPlaintiffUpdate}
            handleAskCommandCenterCopilot={handleAskCommandCenterCopilot}
            handleCreateTasksFromReadiness={handleCreateTasksFromReadiness}
            copilotAnswer={copilotAnswer}
            copilotLoading={copilotLoading}
          />
        </Suspense>
      )}

      {selectedLead && (
        <Suspense fallback={null}>
          <ChatDrawer
            open={chatDrawerOpen}
            onClose={() => {
              setChatDrawerOpen(false)
              setChatDraftPrefill('')
            }}
            plaintiffName={[selectedLead.assessment?.user?.firstName, selectedLead.assessment?.user?.lastName].filter(Boolean).join(' ') || 'Plaintiff'}
            leadId={selectedLead.id}
            userId={selectedLead.assessment?.user?.id ?? null}
            assessmentId={selectedLead.assessment?.id ?? null}
            initialDraft={chatDraftPrefill}
            onMessageSent={() => loadDashboardData(0)}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <DocumentRequestModal
          isOpen={documentRequestModalOpen}
          onClose={() => {
            setDocumentRequestModalOpen(false)
            setDocumentRequestPrefill(null)
          }}
          onSubmit={handleDocumentRequestSubmit}
          selectedCount={selectedLeadIds.size}
          loading={bulkActionLoading}
          initialRequestedDocs={documentRequestPrefill?.requestedDocs}
          initialCustomMessage={documentRequestPrefill?.customMessage}
          initialSendUploadLinkOnly={documentRequestPrefill?.sendUploadLinkOnly}
        />
      </Suspense>
      <Suspense fallback={null}>
        <ScheduleConsultModal
          isOpen={scheduleConsultModalOpen}
          onClose={() => setScheduleConsultModalOpen(false)}
          onSubmit={handleScheduleConsultSubmit}
          leadId={[...selectedLeadIds][0] || ''}
          loading={bulkActionLoading}
        />
      </Suspense>
      {consultCalendarModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setConsultCalendarModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Consult Calendar</h3>
              <button onClick={() => setConsultCalendarModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">×</button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {(dashboardData?.upcomingConsults?.length ?? 0) > 0 ? (
                <ul className="space-y-3">
                  {(dashboardData?.upcomingConsults ?? []).map((c: any) => (
                    <li key={c.id} className="flex items-center gap-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
                      <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">{new Date(c.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — {new Date(c.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                        <p className="text-sm text-gray-600">{c.plaintiffName || '—'} · {(c.claimType || 'Case').replace(/_/g, ' ')}</p>
                        <p className="text-xs text-gray-500">{c.type === 'phone' ? 'Phone consultation' : c.type === 'video' ? 'Video' : 'In person'}</p>
                      </div>
                      {c.leadId && (
                        <button
                          onClick={() => { setConsultCalendarModalOpen(false); navigate(`/attorney-dashboard/lead/${c.leadId}/overview`); }}
                          className="ml-auto text-xs text-brand-600 hover:underline shrink-0"
                        >
                          Open case
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-8">No upcoming consultations scheduled.</p>
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => { setConsultCalendarModalOpen(false); setActiveTab('leads'); setCaseLeadsFilter(f => ({ ...f, status: 'contacted', pipelineStage: 'accepted' })); setActivePipelineTile('accepted'); document.getElementById('cases-filters')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                className="w-full py-2 text-sm font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50"
              >
                View cases to schedule
              </button>
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        <LeadPickerModal
          isOpen={leadPickerOpen}
          onClose={() => { setLeadPickerOpen(false); setLeadPickerAction(null) }}
          leads={dashboardData?.recentLeads ?? []}
          title={leadPickerAction?.action === 'scheduleConsult' ? 'Select case to schedule consultation'
            : leadPickerAction?.action === 'documents' ? 'Select case to view documents'
            : leadPickerAction?.action === 'documentRequest' ? 'Select case to request documents'
            : leadPickerAction?.action === 'draftMessage' ? 'Select case to message'
            : leadPickerAction?.action === 'timeEntry' ? 'Select case for time entry'
            : (leadPickerAction?.action === 'addContact' || leadPickerAction?.section === 'communications') ? 'Select case to add contact'
            : leadPickerAction?.section === 'tasks' ? 'Select case to add task'
            : leadPickerAction?.section === 'demand' ? 'Select case to add note'
            : leadPickerAction?.section === 'insurance' ? 'Select case to add expense'
            : leadPickerAction?.section === 'billing' ? 'Select case to create invoice'
            : 'Select case'}
          onSelect={handleLeadPickerSelect}
          emptyMessage="No cases available. Add a lead first from the Intake tab."
        />
      </Suspense>

      <Suspense fallback={null}>
        <DeclineModal
          open={declineModalOpen}
          onClose={() => {
            setDeclineModalOpen(false)
            setDeclineSuccess(false)
            setDeclineLeadId(null)
          }}
          onSubmit={async (reason, otherText) => {
            if (!declineLeadId) return
            try {
              await handleLeadDecision(
                declineLeadId,
                'reject',
                reason === 'other' ? otherText : undefined,
                reason
              )
              setDeclineSuccess(true)
              setSelectedLead(null)
            } catch {
              // Error already shown by handleLeadDecision
            }
          }}
          loading={leadDecisionLoading}
          success={declineSuccess}
        />
      </Suspense>
    </div>
  )
}
