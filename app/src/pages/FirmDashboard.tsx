import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ClipboardList,
  Building2,
  Plus,
  Star,
  AlertTriangle,
  Search,
  Gauge,
  UserPlus,
  ShieldCheck,
  TrendingUp,
  Clock,
  CalendarClock,
  FileText,
  Workflow,
  X,
  Trash2,
  Shield,
  Ban,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Pencil,
  Inbox,
} from 'lucide-react'
import {
  addFirmAttorney,
  addFirmMember,
  addFirmOffice,
  addFirmTeam,
  updateFirmTeam,
  removeFirmTeam,
  addFirmTeamMember,
  removeFirmTeamMember,
  updateFirmOffice,
  removeFirmOffice,
  updateFirmRolePermissions,
  removeFirmMember,
  updateFirmAttorney,
  updateFirmMember,
  resendFirmMemberInvite,
  assignFirmCase,
  setCaseOffice,
  getFirmTeamCaseload,
  getFirmNewLeads,
  type FirmNewLead,
} from '../lib/api'
import {
  BackButton,
  PageHeader,
  StatGrid,
  FilterStat,
  SectionCard,
  DataTable,
  Badge,
  Avatar,
  EmptyState,
  type BadgeTone,
  type DataTableColumn,
} from '../features/shared/ui'
import { formatCurrency } from '../lib/formatters'
import { formatClaimType } from '../lib/claimTypes'
import { US_STATES } from '../lib/constants'
import { StateMultiSelect } from '../components/StateMultiSelect'
import { invalidateFirmDashboardSummary, useFirmDashboardSummary } from '../hooks/useFirmDashboardSummary'
import { FirmBookingLinksTab } from '../features/firm/FirmBookingLinksTab'
import { FirmTemplatesTab } from '../features/firm/FirmTemplatesTab'
import { FirmWorkflowsTab } from '../features/firm/FirmWorkflowsTab'
import { FirmTimeBillingTab } from '../features/firm/FirmTimeBillingTab'

const CASE_TYPES = [
  { value: 'auto', label: 'Auto Accident' },
  { value: 'slip_and_fall', label: 'Slip-and-Fall' },
  { value: 'dog_bite', label: 'Dog Bite' },
  { value: 'medmal', label: 'Medical Malpractice' },
  { value: 'product', label: 'Product Liability' },
  { value: 'nursing_home_abuse', label: 'Nursing Home Abuse' },
  { value: 'wrongful_death', label: 'Wrongful Death' },
  { value: 'high_severity_surgery', label: 'High-Severity / Surgery' },
]

const FIRM_ROLES = [
  { value: 'firm_admin', label: 'Firm Admin' },
  { value: 'attorney', label: 'Attorney' },
  { value: 'case_manager', label: 'Case Manager' },
  { value: 'intake_specialist', label: 'Intake Specialist' },
  { value: 'paralegal', label: 'Paralegal' },
  { value: 'billing_admin', label: 'Billing/Admin' },
  { value: 'legal_assistant', label: 'Legal Assistant' },
  { value: 'demand_writer', label: 'Demand Writer' },
  { value: 'medical_records', label: 'Medical Records' },
]

// Human-friendly labels + one-line descriptions for every firm permission.
// Ordered so the role matrix columns stay stable regardless of API ordering.
const PERMISSION_LABELS: Record<string, string> = {
  manage_users: 'Manage users',
  manage_routing: 'Manage routing',
  assign_cases: 'Assign cases',
  view_all_cases: 'View all cases',
  view_assigned_cases: 'View assigned cases',
  view_analytics: 'View analytics',
  review_cases: 'Review cases',
  review_new_leads: 'Review new leads',
  accept_cases: 'Accept cases',
  decline_cases: 'Decline cases',
  manage_assigned_cases: 'Work assigned cases',
  message_plaintiffs: 'Message clients',
  schedule_consultations: 'Schedule consults',
  generate_demands: 'Generate demands',
  manage_chronology: 'Manage chronology',
  upload_records: 'Upload records',
  request_records: 'Request records',
  request_evidence: 'Request evidence',
  manage_documents: 'Manage documents',
  upload_documents: 'Upload documents',
  manage_billing: 'Manage billing',
  manage_invoices: 'Manage invoices',
  process_payments: 'Process payments',
  manage_subscriptions: 'Manage subscriptions',
  view_subscriptions: 'View subscriptions',
}

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  manage_users: 'Add, edit, and remove firm members and set their roles.',
  manage_routing: 'Configure how new matched cases are routed to the firm.',
  assign_cases: 'Assign or reassign cases to attorneys and staff.',
  view_all_cases: 'See every case in the firm, not just assigned ones.',
  view_assigned_cases: 'See only the cases this person is assigned to.',
  view_analytics: 'View firm performance dashboards and reports.',
  review_cases: 'Open and review incoming case details.',
  review_new_leads: 'Triage newly matched leads before acceptance.',
  accept_cases: 'Accept a matched case on behalf of the firm.',
  decline_cases: 'Decline a matched case on behalf of the firm.',
  manage_assigned_cases: 'Do day-to-day work on assigned cases.',
  message_plaintiffs: 'Message clients through the platform.',
  schedule_consultations: 'Book and manage client consultations.',
  generate_demands: 'Draft and generate demand letters.',
  manage_chronology: 'Build and edit the medical/treatment chronology.',
  upload_records: 'Upload medical and billing records.',
  request_records: 'Request records from providers.',
  request_evidence: 'Request evidence and documents from clients.',
  manage_documents: 'Organize and manage case documents.',
  upload_documents: 'Upload documents to a case.',
  manage_billing: 'Manage firm billing and platform spend.',
  manage_invoices: 'Create and manage client invoices.',
  process_payments: 'Process client and settlement payments.',
  manage_subscriptions: 'Change the firm plan and seats.',
  view_subscriptions: 'View the firm plan and seat usage.',
}

// Mirror of api/src/lib/firm-roles.ts — used only if the API hasn't sent
// roleCapabilities (older backend). The API remains the source of truth.
const FIRM_ROLE_PERMISSIONS_FALLBACK: Record<string, string[]> = {
  firm_admin: ['manage_users', 'manage_routing', 'manage_billing', 'view_all_cases', 'view_analytics', 'assign_cases', 'manage_subscriptions'],
  attorney: ['review_cases', 'accept_cases', 'decline_cases', 'message_plaintiffs', 'generate_demands', 'manage_assigned_cases', 'assign_cases'],
  case_manager: ['upload_records', 'manage_documents', 'message_plaintiffs', 'request_evidence', 'manage_assigned_cases'],
  intake_specialist: ['review_new_leads', 'schedule_consultations', 'request_records'],
  paralegal: ['view_assigned_cases', 'manage_chronology', 'upload_documents'],
  billing_admin: ['manage_invoices', 'view_subscriptions', 'process_payments'],
  legal_assistant: ['view_assigned_cases', 'manage_documents', 'schedule_consultations'],
  demand_writer: ['view_assigned_cases', 'generate_demands', 'manage_documents'],
  medical_records: ['view_assigned_cases', 'upload_records', 'request_records'],
}

const humanizePermission = (p: string) =>
  PERMISSION_LABELS[p] || p.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const TEAM_TYPES = [
  { value: 'case_team', label: 'Case Team' },
  { value: 'intake', label: 'Intake' },
  { value: 'litigation', label: 'Litigation' },
  { value: 'records', label: 'Medical Records' },
  { value: 'demand', label: 'Demand Writing' },
  { value: 'billing', label: 'Billing' },
  { value: 'negotiation', label: 'Negotiation' },
]

const NAME_MAX = 120
const EMAIL_MAX = 254

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30'
const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50'
const btnGhost =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50'

const formatRole = (role: string) =>
  (role || '').split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')

const titleCase = (s?: string | null) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

const STATUS_TONE: Record<string, BadgeTone> = {
  retained: 'success',
  consulted: 'blue',
  contacted: 'brand',
  new: 'warning',
  declined: 'danger',
}
const statusTone = (s?: string | null): BadgeTone => STATUS_TONE[(s || '').toLowerCase()] || 'neutral'

interface FirmCaseRow {
  assessmentId: string
  leadId: string | null
  clientName: string | null
  claimType: string | null
  venueCounty?: string | null
  venueState?: string | null
  leadStatus: string
  updatedAt?: string | null
  primaryAttorney?: { id: string; name: string } | null
  assignments: Array<{ role: string; name: string | null }>
  openTaskCount: number
  unassigned: boolean
  officeId?: string | null
}

interface FirmDashboardData {
  firm: {
    id: string
    name: string
    city?: string | null
    state?: string | null
    website?: string | null
    phone?: string | null
    primaryEmail?: string | null
  }
  metrics: {
    attorneyCount: number
    totalLeadsReceived: number
    totalLeadsAccepted: number
    feesCollectedFromPayments: number
    totalPlatformSpend: number
    avgAttorneyRating: number
    totalReviews: number
    verifiedReviewCount: number
    activeCases?: number
    acceptedCases?: number
    retainedCases?: number
    operationsQueueCount?: number
    firmROI: number | null
  }
  workspace?: {
    currentRole: string
    permissions: string[]
    roleCapabilities: Record<string, string[]>
    assignmentRoles: string[]
    subscription: { planName: string; includedSeats: number; seatMix: Record<string, number> }
  }
  offices?: Array<{ id: string; name: string; city?: string | null; state?: string | null; capacity?: number | null }>
  teams?: Array<{ id: string; name: string; teamType: string; office?: { id: string; name: string } | null; members: Array<{ id: string; firmMemberId?: string; teamRole?: string; role: string; name?: string; email?: string }> }>
  members?: Array<{
    id: string
    role: string
    title?: string | null
    office?: { id: string; name: string } | null
    user?: { id: string; email: string; firstName?: string; lastName?: string }
    attorney?: { id: string; name: string; email?: string | null } | null
  }>
  operationsQueue?: Array<{
    id: string
    assessmentId: string
    title: string
    taskType: string
    assignedRole?: string | null
    assignedTo?: string | null
    priority: string
    dueDate?: string | null
    caseType: string
    venueCounty?: string | null
    leadStatus: string
  }>
  cases?: FirmCaseRow[]
  attorneys: Array<{
    id: string
    name: string
    email: string | null
    isVerified: boolean
    responseTimeHours: number
    averageRating: number
    totalReviews: number
    verifiedReviewCount: number
    subscriptionTier: string | null
    specialties: string[]
    jurisdictions: Array<{ state: string; counties?: string[] }>
    dashboard: { totalLeadsReceived: number; totalLeadsAccepted: number; feesCollectedFromPayments: number; totalPlatformSpend: number } | null
  }>
}

type CaseloadData = {
  teams: Array<{ teamId: string; name: string; teamType: string; memberCount: number; activeCaseCount: number }>
  offices: Array<{ officeId: string; name: string; capacity: number | null; assignedCases: number; utilization: number | null }>
}

type TabKey = 'overview' | 'newleads' | 'caseload' | 'team' | 'booking' | 'templates' | 'workflow' | 'time'
const TABS: Array<{ key: TabKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'newleads', label: 'New Leads', icon: Inbox },
  { key: 'caseload', label: 'Caseload', icon: Briefcase },
  { key: 'team', label: 'Team & Roles', icon: Users },
  { key: 'booking', label: 'Booking Links', icon: CalendarClock },
  { key: 'templates', label: 'Firm Templates', icon: FileText },
  { key: 'workflow', label: 'Workflow', icon: Workflow },
  { key: 'time', label: 'Time & Billing', icon: Clock },
]

// Firm attorneys and admins keep full access to every tab (no regression from
// before staff login existed). Non-attorney staff (paralegal, case manager,
// intake specialist, etc.) see only the tabs their permissions support.
const FULL_ACCESS_FIRM_ROLES = ['firm_admin', 'attorney']

function canSeeFirmTab(tab: TabKey, role: string | undefined, permissions: string[]): boolean {
  if (!role || FULL_ACCESS_FIRM_ROLES.includes(role)) return true
  const has = (p: string) => permissions.includes(p)
  switch (tab) {
    case 'overview':
    case 'caseload':
      return true
    case 'newleads':
      // Intake specialists own this surface; firm admins/attorneys reach it via
      // their broader case-visibility permissions (CP-588).
      return has('review_new_leads') || has('view_all_cases') || has('review_cases') || has('accept_cases')
    case 'team':
      return has('manage_users')
    case 'booking':
      return has('schedule_consultations') || has('manage_users')
    case 'templates':
      return has('manage_documents') || has('generate_demands')
    case 'workflow':
      return has('manage_routing')
    case 'time':
      return has('manage_billing') || has('manage_invoices') || has('process_payments')
    default:
      return false
  }
}

export default function FirmDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  // Go back to wherever the user came from. location.key is 'default' only when
  // this is the first entry in the session (e.g. opened/refreshed directly here),
  // in which case fall back to the Attorney Dashboard.
  const goBack = () => {
    if (location.key && location.key !== 'default') navigate(-1)
    else navigate('/attorney-dashboard')
  }
  const { data, loading, error, refresh } = useFirmDashboardSummary()

  const [tab, setTab] = useState<TabKey>('overview')
  const [caseload, setCaseload] = useState<CaseloadData | null>(null)
  const [caseOfficeSavingId, setCaseOfficeSavingId] = useState<string | null>(null)

  // Cases tab
  const [caseFilter, setCaseFilter] = useState<'all' | 'unassigned'>('all')
  const [caseQuery, setCaseQuery] = useState('')

  // Caseload tab (team visibility: who owns / is working on what)
  const [caseloadMember, setCaseloadMember] = useState<string>('all')
  const [caseloadQuery, setCaseloadQuery] = useState('')
  const [assignTarget, setAssignTarget] = useState<FirmCaseRow | null>(null)
  const [assignRole, setAssignRole] = useState('lead_attorney')
  const [assignee, setAssignee] = useState('')
  const [assignSaving, setAssignSaving] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)

  // Operations tab
  const [opPriority, setOpPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [opQuery, setOpQuery] = useState('')

  // Add / edit forms
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState<string | null>(null)
  const [newAttorney, setNewAttorney] = useState({ firstName: '', middleName: '', lastName: '', email: '', specialties: [] as string[], jurisdictions: [] as string[], officeId: '' })
  const [newMember, setNewMember] = useState({ firstName: '', lastName: '', email: '', role: 'case_manager', title: '', officeId: '' })
  const [memberOfficeSavingId, setMemberOfficeSavingId] = useState<string | null>(null)
  const [resendingMemberId, setResendingMemberId] = useState<string | null>(null)
  const [memberSaving, setMemberSaving] = useState(false)
  const [memberError, setMemberError] = useState<string | null>(null)
  const [memberSuccess, setMemberSuccess] = useState<string | null>(null)
  const [newOffice, setNewOffice] = useState({ name: '', city: '', state: '', capacity: '' })
  const [officeSaving, setOfficeSaving] = useState(false)
  const [officeError, setOfficeError] = useState<string | null>(null)
  const [officeSuccess, setOfficeSuccess] = useState<string | null>(null)
  const [newTeam, setNewTeam] = useState({ name: '', teamType: 'case_team', officeId: '' })
  const [manageTeamId, setManageTeamId] = useState<string | null>(null)
  const [teamMemberPick, setTeamMemberPick] = useState<{ firmMemberId: string; role: 'lead' | 'member' }>({ firmMemberId: '', role: 'member' })
  const [teamMemberSaving, setTeamMemberSaving] = useState(false)
  const [teamMemberError, setTeamMemberError] = useState<string | null>(null)
  const [peopleFilter, setPeopleFilter] = useState<'all' | 'attorneys' | 'staff'>('all')
  const [addPersonType, setAddPersonType] = useState<'attorney' | 'staff'>('attorney')
  const [showRolePermissions, setShowRolePermissions] = useState(true)
  const [expandedMatrixRole, setExpandedMatrixRole] = useState<string | null>(null)
  const [savingRolePerm, setSavingRolePerm] = useState<string | null>(null)
  const [roleMatrixError, setRoleMatrixError] = useState<string | null>(null)
  // Explicit per-role permission editor (checkbox modal)
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [editRolePerms, setEditRolePerms] = useState<string[]>([])
  const [roleSaving, setRoleSaving] = useState(false)
  // Team / office edit + delete
  const [editingTeam, setEditingTeam] = useState<any>(null)
  const [editTeamForm, setEditTeamForm] = useState({ name: '', teamType: 'case_team', officeId: '' })
  const [teamEditSaving, setTeamEditSaving] = useState(false)
  const [editingOffice, setEditingOffice] = useState<any>(null)
  const [editOfficeForm, setEditOfficeForm] = useState({ name: '', city: '', state: '', address: '', phone: '', capacity: '' })
  const [officeEditSaving, setOfficeEditSaving] = useState(false)
  const [teamOfficeError, setTeamOfficeError] = useState<string | null>(null)
  const [teamSaving, setTeamSaving] = useState(false)
  const [teamError, setTeamError] = useState<string | null>(null)
  const [teamSuccess, setTeamSuccess] = useState<string | null>(null)
  const [editingAttorneyId, setEditingAttorneyId] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editAttorney, setEditAttorney] = useState({ firstName: '', middleName: '', lastName: '', specialties: [] as string[], jurisdictions: [] as string[] })

  // Member permissions editor state
  const [editingMember, setEditingMember] = useState<any>(null)
  const [editMemberRole, setEditMemberRole] = useState('')
  const [editMemberTitle, setEditMemberTitle] = useState('')
  const [editMemberPermOverrides, setEditMemberPermOverrides] = useState<string[]>([])
  const [editMemberSaving, setEditMemberSaving] = useState(false)
  const [editMemberError, setEditMemberError] = useState<string | null>(null)
  const [confirmRemoveMember, setConfirmRemoveMember] = useState(false)

  const refreshCaseload = useCallback(async () => {
    try {
      const d = await getFirmTeamCaseload()
      setCaseload(d)
    } catch {
      setCaseload(null)
    }
  }, [])

  useEffect(() => {
    void refreshCaseload()
  }, [refreshCaseload])

  // New Leads tab: marketplace leads routed to the firm, split into active
  // offers and expired (lapsed/re-routed) ones (CP-588, CP-592).
  const [newLeads, setNewLeads] = useState<{ active: FirmNewLead[]; expired: FirmNewLead[] }>({ active: [], expired: [] })
  const [newLeadsLoading, setNewLeadsLoading] = useState(false)
  const [newLeadsError, setNewLeadsError] = useState<string | null>(null)

  const refreshNewLeads = useCallback(async () => {
    setNewLeadsLoading(true)
    setNewLeadsError(null)
    try {
      setNewLeads(await getFirmNewLeads())
    } catch (err: any) {
      setNewLeadsError(err?.response?.data?.error || 'Failed to load new leads.')
      setNewLeads({ active: [], expired: [] })
    } finally {
      setNewLeadsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'newleads') void refreshNewLeads()
  }, [tab, refreshNewLeads])

  const newLeadColumns = useMemo<DataTableColumn<FirmNewLead>[]>(
    () => [
      {
        key: 'case',
        header: 'Case',
        cell: (r) => (
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-800">{r.caseName || formatClaimType(r.claimType)}</div>
            <div className="truncate text-xs text-slate-400">
              {formatClaimType(r.claimType)}
              {r.venueCounty ? ` · ${r.venueCounty}` : ''}
              {r.venueState ? `, ${r.venueState}` : ''}
              {r.referenceCode ? ` · ${r.referenceCode}` : ''}
            </div>
          </div>
        ),
      },
      {
        key: 'routedTo',
        header: 'Routed to',
        cell: (r) =>
          r.attorneys.length === 0 ? (
            <span className="text-slate-300">—</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {r.attorneys.slice(0, 4).map((a) => (
                <span key={a.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {a.name}
                </span>
              ))}
              {r.attorneys.length > 4 && <span className="text-xs text-slate-400">+{r.attorneys.length - 4}</span>}
            </div>
          ),
      },
      { key: 'wave', header: 'Wave', align: 'center', cell: (r) => <span className="text-slate-500">{r.waveNumber}</span> },
      {
        key: 'routed',
        header: 'Routed',
        cell: (r) => <span className="text-slate-400">{r.routedAt ? new Date(r.routedAt).toLocaleDateString() : '—'}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        cell: (r) => (r.status === 'expired' ? <Badge tone="warning">Expired</Badge> : <Badge tone="blue">New</Badge>),
      },
    ],
    [],
  )

  // Move a case to a different office, then refresh cases + capacity bars.
  const handleCaseOfficeChange = async (assessmentId: string, officeId: string) => {
    setCaseOfficeSavingId(assessmentId)
    try {
      await setCaseOffice(assessmentId, officeId || null)
      await Promise.all([refresh(true), refreshCaseload()])
    } catch {
      /* surfaced by the summary error banner on next load */
    } finally {
      setCaseOfficeSavingId(null)
    }
  }

  const toggleAttorneyArrayValue = (key: 'specialties' | 'jurisdictions', value: string) => {
    setNewAttorney((prev) => {
      const current = prev[key]
      return { ...prev, [key]: current.includes(value) ? current.filter((i) => i !== value) : [...current, value] }
    })
  }
  const toggleEditArrayValue = (key: 'specialties' | 'jurisdictions', value: string) => {
    setEditAttorney((prev) => {
      const current = prev[key]
      return { ...prev, [key]: current.includes(value) ? current.filter((i) => i !== value) : [...current, value] }
    })
  }

  const startEditAttorney = (attorney: FirmDashboardData['attorneys'][number]) => {
    const nameParts = (attorney.name || '').trim().split(/\s+/).filter(Boolean)
    setEditingAttorneyId(attorney.id)
    setEditError(null)
    setEditAttorney({
      firstName: nameParts[0] || '',
      middleName: nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '',
      lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : '',
      specialties: Array.isArray(attorney.specialties) ? attorney.specialties : [],
      jurisdictions: Array.isArray(attorney.jurisdictions) ? attorney.jurisdictions.map((j) => j.state) : [],
    })
  }

  const handleSaveEditAttorney = async () => {
    if (!editingAttorneyId) return
    setEditError(null)
    if (editAttorney.specialties.length === 0) return setEditError('Please select at least one specialty.')
    if (editAttorney.jurisdictions.length === 0) return setEditError('Please select at least one jurisdiction.')
    try {
      setEditSaving(true)
      await updateFirmAttorney(editingAttorneyId, {
        firstName: editAttorney.firstName.trim() || undefined,
        middleName: editAttorney.middleName.trim() || undefined,
        lastName: editAttorney.lastName.trim() || undefined,
        specialties: editAttorney.specialties,
        venues: editAttorney.jurisdictions,
        jurisdictions: editAttorney.jurisdictions.map((state) => ({ state })),
      })
      setEditingAttorneyId(null)
      invalidateFirmDashboardSummary()
    } catch (err: any) {
      setEditError(err.response?.data?.error || 'Failed to update attorney.')
    } finally {
      setEditSaving(false)
    }
  }

  const handleAddAttorney = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)
    setAddSuccess(null)
    if (!newAttorney.email.trim()) return setAddError('Attorney email is required.')
    if (!isValidEmail(newAttorney.email)) return setAddError('Please enter a valid email address.')
    if (newAttorney.specialties.length === 0) return setAddError('Please select at least one specialty.')
    if (newAttorney.jurisdictions.length === 0) return setAddError('Please select at least one jurisdiction.')
    try {
      setAdding(true)
      const added: any = await addFirmAttorney({
        email: newAttorney.email.trim(),
        firstName: newAttorney.firstName.trim() || undefined,
        middleName: newAttorney.middleName.trim() || undefined,
        lastName: newAttorney.lastName.trim() || undefined,
        specialties: newAttorney.specialties,
        venues: newAttorney.jurisdictions,
        jurisdictions: newAttorney.jurisdictions.map((state) => ({ state })),
        officeId: newAttorney.officeId || undefined,
      })
      setAddSuccess(
        added?.emailSent === false
          ? 'Attorney added, but the invitation email could not be delivered. Ask them to use “Forgot password” to set their password.'
          : 'Attorney added to firm. An invitation email is on its way.',
      )
      setNewAttorney({ firstName: '', middleName: '', lastName: '', email: '', specialties: [], jurisdictions: [], officeId: '' })
      invalidateFirmDashboardSummary()
    } catch (err: any) {
      setAddError(err.response?.data?.error || 'Failed to add attorney.')
    } finally {
      setAdding(false)
    }
  }

  const handleAddStaffMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setMemberError(null)
    setMemberSuccess(null)
    if (!newMember.email.trim()) return setMemberError('Team member email is required.')
    if (!isValidEmail(newMember.email)) return setMemberError('Please enter a valid email address.')
    try {
      setMemberSaving(true)
      const created: any = await addFirmMember({
        email: newMember.email.trim(),
        firstName: newMember.firstName.trim() || undefined,
        lastName: newMember.lastName.trim() || undefined,
        role: newMember.role,
        title: newMember.title.trim() || undefined,
        officeId: newMember.officeId || undefined,
      })
      setMemberSuccess(
        created?.emailSent === false
          ? 'Team member added, but the invitation email could not be delivered. Use “Resend invite”, or ask them to use “Forgot password” to set their password.'
          : 'Invitation sent. They’ll get an email to verify and set their password.',
      )
      setNewMember({ firstName: '', lastName: '', email: '', role: 'case_manager', title: '', officeId: '' })
      invalidateFirmDashboardSummary()
    } catch (err: any) {
      setMemberError(err.response?.data?.error || 'Failed to add firm team member.')
    } finally {
      setMemberSaving(false)
    }
  }

  const handleMemberOfficeChange = async (memberId: string, officeId: string) => {
    setMemberOfficeSavingId(memberId)
    try {
      await updateFirmMember(memberId, { officeId: officeId || null })
      invalidateFirmDashboardSummary()
    } catch (err: any) {
      setMemberError(err.response?.data?.error || 'Failed to move member to office.')
    } finally {
      setMemberOfficeSavingId(null)
    }
  }

  const handleResendInvite = async (memberId: string) => {
    setMemberError(null)
    setMemberSuccess(null)
    setResendingMemberId(memberId)
    try {
      const res = await resendFirmMemberInvite(memberId)
      setMemberSuccess(res.emailSent ? 'Invitation email resent.' : 'Invitation refreshed (email delivery pending).')
    } catch (err: any) {
      setMemberError(err.response?.data?.error || 'Failed to resend invitation.')
    } finally {
      setResendingMemberId(null)
    }
  }

  const handleAddOffice = async (e: React.FormEvent) => {
    e.preventDefault()
    setOfficeError(null)
    setOfficeSuccess(null)
    if (!newOffice.name.trim()) return setOfficeError('Office name is required.')
    const parsedCapacity = Number(newOffice.capacity)
    const capacity = newOffice.capacity.trim() && Number.isFinite(parsedCapacity) ? Math.max(0, Math.floor(parsedCapacity)) : undefined
    try {
      setOfficeSaving(true)
      await addFirmOffice({ name: newOffice.name.trim(), city: newOffice.city.trim() || undefined, state: newOffice.state.trim() || undefined, capacity })
      setOfficeSuccess('Office added.')
      setNewOffice({ name: '', city: '', state: '', capacity: '' })
      invalidateFirmDashboardSummary()
    } catch (err: any) {
      setOfficeError(err.response?.data?.error || 'Failed to add office.')
    } finally {
      setOfficeSaving(false)
    }
  }

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setTeamError(null)
    setTeamSuccess(null)
    if (!newTeam.name.trim()) return setTeamError('Team name is required.')
    try {
      setTeamSaving(true)
      await addFirmTeam({ name: newTeam.name.trim(), teamType: newTeam.teamType, officeId: newTeam.officeId || undefined })
      setTeamSuccess('Team added.')
      setNewTeam({ name: '', teamType: 'case_team', officeId: '' })
      invalidateFirmDashboardSummary()
    } catch (err: any) {
      setTeamError(err.response?.data?.error || 'Failed to add team.')
    } finally {
      setTeamSaving(false)
    }
  }

  const handleAddTeamMember = async (teamId: string) => {
    setTeamMemberError(null)
    if (!teamMemberPick.firmMemberId) return setTeamMemberError('Pick a team member to add.')
    try {
      setTeamMemberSaving(true)
      await addFirmTeamMember(teamId, { firmMemberId: teamMemberPick.firmMemberId, role: teamMemberPick.role })
      setTeamMemberPick({ firmMemberId: '', role: 'member' })
      invalidateFirmDashboardSummary()
    } catch (err: any) {
      setTeamMemberError(err.response?.data?.error || 'Failed to add member to team.')
    } finally {
      setTeamMemberSaving(false)
    }
  }

  const handleRemoveTeamMember = async (teamId: string, firmMemberId: string) => {
    setTeamMemberError(null)
    try {
      setTeamMemberSaving(true)
      await removeFirmTeamMember(teamId, firmMemberId)
      invalidateFirmDashboardSummary()
    } catch (err: any) {
      setTeamMemberError(err.response?.data?.error || 'Failed to remove member.')
    } finally {
      setTeamMemberSaving(false)
    }
  }

  const openAssign = (row: FirmCaseRow) => {
    setAssignTarget(row)
    setAssignRole('lead_attorney')
    setAssignee('')
    setAssignError(null)
  }

  const submitAssign = async () => {
    if (!assignTarget || !assignee) {
      setAssignError('Select a team member to assign.')
      return
    }
    const [kind, id] = assignee.split(':')
    try {
      setAssignSaving(true)
      setAssignError(null)
      await assignFirmCase(assignTarget.assessmentId, {
        role: assignRole,
        assignedAttorneyId: kind === 'att' ? id : undefined,
        assignedUserId: kind === 'usr' ? id : undefined,
      })
      setAssignTarget(null)
      invalidateFirmDashboardSummary()
    } catch (err: any) {
      setAssignError(err.response?.data?.error || 'Failed to assign case.')
    } finally {
      setAssignSaving(false)
    }
  }

  const dashboardData = (data || null) as FirmDashboardData | null
  const firm = (dashboardData?.firm || {}) as FirmDashboardData['firm']
  const metrics = (dashboardData?.metrics || {}) as FirmDashboardData['metrics']
  const attorneys = dashboardData?.attorneys || []
  const members = dashboardData?.members || []
  const offices = dashboardData?.offices || []
  const teams = dashboardData?.teams || []

  // Join the lightweight member rows to the richer attorney records so the
  // unified People roster can show specialties/rating and open the edit modal.
  const attorneyById = useMemo(() => {
    const m = new Map<string, any>()
    for (const a of attorneys) m.set(a.id, a)
    return m
  }, [attorneys])
  // Which teams each firm member belongs to (a person can be on many teams).
  const teamsByMemberId = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const t of teams) {
      for (const mem of t.members || []) {
        const id = mem.firmMemberId || mem.id
        if (!id) continue
        const arr = map.get(id) || []
        arr.push(t.name)
        map.set(id, arr)
      }
    }
    return map
  }, [teams])
  const isAttorneyMember = (m: any) => Boolean(m.attorney || m.role === 'attorney')
  const filteredPeople = useMemo(() => {
    if (peopleFilter === 'attorneys') return members.filter(isAttorneyMember)
    if (peopleFilter === 'staff') return members.filter((m: any) => !isAttorneyMember(m))
    return members
  }, [members, peopleFilter])
  const operationsQueue = dashboardData?.operationsQueue || []
  const cases = dashboardData?.cases || []
  const workspace = dashboardData?.workspace
  const assignmentRoles = workspace?.assignmentRoles || ['lead_attorney', 'secondary_attorney', 'case_manager', 'paralegal']

  const ALL_PERMISSIONS = useMemo(() => {
    const set = new Set<string>()
    Object.values(workspace?.roleCapabilities || {}).forEach((perms: any) =>
      (perms as string[]).forEach((p) => set.add(p))
    )
    return Array.from(set).sort()
  }, [workspace?.roleCapabilities])

  // Role × permission matrix data. Uses the API's roleCapabilities when present,
  // else the local mirror. Columns are ordered by PERMISSION_LABELS, with any
  // unknown permissions appended so nothing is silently dropped.
  const roleMatrix = useMemo(() => {
    const apiCaps = workspace?.roleCapabilities as Record<string, string[]> | undefined
    const caps = apiCaps && Object.keys(apiCaps).length ? apiCaps : FIRM_ROLE_PERMISSIONS_FALLBACK
    const knownRoleOrder = FIRM_ROLES.map((r) => r.value)
    const roles = [
      ...knownRoleOrder.filter((r) => caps[r]),
      ...Object.keys(caps).filter((r) => !knownRoleOrder.includes(r)),
    ]
    const present = new Set<string>()
    roles.forEach((r) => (caps[r] || []).forEach((p) => present.add(p)))
    const orderedKnown = Object.keys(PERMISSION_LABELS).filter((p) => present.has(p))
    const extras = Array.from(present).filter((p) => !orderedKnown.includes(p))
    const columns = [...orderedKnown, ...extras]
    return { caps, roles, columns }
  }, [workspace?.roleCapabilities])

  const canManageUsers =
    (workspace?.permissions || []).includes('manage_users') || workspace?.currentRole === 'firm_admin'
  const canManageRouting =
    (workspace?.permissions || []).includes('manage_routing') || workspace?.currentRole === 'firm_admin'

  // firm_admin can never lose manage_users (mirrors the server-side lock).
  const isLockedCell = (role: string, perm: string) => role === 'firm_admin' && perm === 'manage_users'

  const toggleRolePermission = async (role: string, perm: string, has: boolean) => {
    if (!canManageUsers || isLockedCell(role, perm)) return
    const current = roleMatrix.caps[role] || []
    const next = has ? current.filter((p) => p !== perm) : [...current, perm]
    const key = `${role}:${perm}`
    setSavingRolePerm(key)
    setRoleMatrixError(null)
    try {
      await updateFirmRolePermissions(role, next)
      await refresh(true)
    } catch (e: any) {
      setRoleMatrixError(e?.response?.data?.error || 'Failed to update permission.')
    } finally {
      setSavingRolePerm(null)
    }
  }

  // Full permission catalog (labelled perms + any extras a firm already uses).
  const permissionCatalog = useMemo(
    () => Array.from(new Set([...Object.keys(PERMISSION_LABELS), ...roleMatrix.columns])),
    [roleMatrix.columns],
  )

  const openEditRole = (role: string) => {
    setEditingRole(role)
    setEditRolePerms([...(roleMatrix.caps[role] || [])])
    setRoleMatrixError(null)
  }

  const toggleEditRolePerm = (perm: string) => {
    if (editingRole && isLockedCell(editingRole, perm)) return
    setEditRolePerms((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]))
  }

  const submitEditRole = async () => {
    if (!editingRole) return
    setRoleSaving(true)
    setRoleMatrixError(null)
    try {
      await updateFirmRolePermissions(editingRole, editRolePerms)
      setEditingRole(null)
      await refresh(true)
    } catch (e: any) {
      setRoleMatrixError(e?.response?.data?.error || 'Failed to update permissions.')
    } finally {
      setRoleSaving(false)
    }
  }

  const openEditTeam = (team: any) => {
    setEditingTeam(team)
    setEditTeamForm({ name: team.name || '', teamType: team.teamType || 'case_team', officeId: team.office?.id || '' })
    setTeamOfficeError(null)
  }

  const submitEditTeam = async () => {
    if (!editingTeam) return
    if (!editTeamForm.name.trim()) {
      setTeamOfficeError('Team name is required.')
      return
    }
    setTeamEditSaving(true)
    setTeamOfficeError(null)
    try {
      await updateFirmTeam(editingTeam.id, {
        name: editTeamForm.name.trim(),
        teamType: editTeamForm.teamType,
        officeId: editTeamForm.officeId || null,
      })
      setEditingTeam(null)
      await refresh(true)
    } catch (e: any) {
      setTeamOfficeError(e?.response?.data?.error || 'Failed to update team.')
    } finally {
      setTeamEditSaving(false)
    }
  }

  const handleDeleteTeam = async (team: any) => {
    if (!window.confirm(`Delete team "${team.name}"? Members stay in the firm; only the team grouping is removed.`)) return
    setTeamOfficeError(null)
    try {
      await removeFirmTeam(team.id)
      await refresh(true)
    } catch (e: any) {
      setTeamOfficeError(e?.response?.data?.error || 'Failed to delete team.')
    }
  }

  const openEditOffice = (office: any) => {
    setEditingOffice(office)
    setEditOfficeForm({
      name: office.name || '',
      city: office.city || '',
      state: office.state || '',
      address: office.address || '',
      phone: office.phone || '',
      capacity: office.capacity != null ? String(office.capacity) : '',
    })
    setTeamOfficeError(null)
  }

  const submitEditOffice = async () => {
    if (!editingOffice) return
    if (!editOfficeForm.name.trim()) {
      setTeamOfficeError('Office name is required.')
      return
    }
    setOfficeEditSaving(true)
    setTeamOfficeError(null)
    try {
      await updateFirmOffice(editingOffice.id, {
        name: editOfficeForm.name.trim(),
        city: editOfficeForm.city.trim() || undefined,
        state: editOfficeForm.state.trim() || undefined,
        address: editOfficeForm.address.trim() || undefined,
        phone: editOfficeForm.phone.trim() || undefined,
        capacity: editOfficeForm.capacity !== '' ? Number(editOfficeForm.capacity) : undefined,
      })
      setEditingOffice(null)
      await refresh(true)
    } catch (e: any) {
      setTeamOfficeError(e?.response?.data?.error || 'Failed to update office.')
    } finally {
      setOfficeEditSaving(false)
    }
  }

  const handleDeleteOffice = async (office: any) => {
    if (!window.confirm(`Delete office "${office.name}"? Members, teams, and cases here will be unassigned from it.`)) return
    setTeamOfficeError(null)
    try {
      await removeFirmOffice(office.id)
      await refresh(true)
    } catch (e: any) {
      setTeamOfficeError(e?.response?.data?.error || 'Failed to delete office.')
    }
  }

  const openEditMember = (m: any) => {
    setEditingMember(m)
    setEditMemberRole(m.role || 'intake_specialist')
    setEditMemberTitle(m.title || '')
    const overrides = (() => {
      try { return JSON.parse(m.permissions || '[]') } catch { return [] }
    })()
    setEditMemberPermOverrides(Array.isArray(overrides) ? overrides : [])
    setEditMemberError(null)
    setConfirmRemoveMember(false)
  }

  const roleDefaultPerms: string[] = useMemo(() => {
    return (workspace?.roleCapabilities as Record<string, string[]> | undefined)?.[editMemberRole] || []
  }, [editMemberRole, workspace?.roleCapabilities])

  const togglePermOverride = (perm: string) => {
    setEditMemberPermOverrides((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    )
  }

  const handleSaveMember = async () => {
    if (!editingMember) return
    setEditMemberSaving(true)
    setEditMemberError(null)
    try {
      const extraPerms = editMemberPermOverrides.filter((p) => !roleDefaultPerms.includes(p))
      await updateFirmMember(editingMember.id, {
        role: editMemberRole,
        title: editMemberTitle.trim() || null,
        permissions: extraPerms.length > 0 ? extraPerms : null,
      })
      await refresh(true)
      setEditingMember(null)
    } catch (err: any) {
      setEditMemberError(err.response?.data?.error || 'Failed to update member.')
    } finally {
      setEditMemberSaving(false)
    }
  }

  const handleToggleMemberStatus = async (newStatus: 'active' | 'suspended') => {
    if (!editingMember) return
    setEditMemberSaving(true)
    setEditMemberError(null)
    try {
      await updateFirmMember(editingMember.id, { status: newStatus })
      await refresh(true)
      setEditingMember(null)
    } catch (err: any) {
      setEditMemberError(err.response?.data?.error || `Failed to ${newStatus === 'suspended' ? 'suspend' : 'reactivate'} member.`)
    } finally {
      setEditMemberSaving(false)
    }
  }

  const handleRemoveMember = async () => {
    if (!editingMember) return
    setEditMemberSaving(true)
    setEditMemberError(null)
    try {
      await removeFirmMember(editingMember.id)
      await refresh(true)
      setEditingMember(null)
    } catch (err: any) {
      setEditMemberError(err.response?.data?.error || 'Failed to remove member.')
    } finally {
      setEditMemberSaving(false)
    }
  }

  // Scope the visible tabs to what this member's role/permissions allow. Firm
  // attorneys/admins see everything; staff see a relevant subset (CP-337).
  const visibleTabs = useMemo(
    () => TABS.filter((t) => canSeeFirmTab(t.key, workspace?.currentRole, workspace?.permissions || [])),
    [workspace?.currentRole, workspace?.permissions],
  )
  // If the active tab isn't available to this member, fall back to the first
  // one they can see (Overview for everyone).
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((t) => t.key === tab)) {
      setTab(visibleTabs[0].key)
    }
  }, [visibleTabs, tab])

  const canSeeTab = (k: TabKey) => visibleTabs.some((t) => t.key === k)
  // Jump to a tab from a summary tile (only if the user can see that tab).
  const goToTab = (k: TabKey, opts?: { people?: 'all' | 'attorneys' | 'staff' }) => {
    if (!canSeeTab(k)) return
    if (opts?.people) setPeopleFilter(opts.people)
    setTab(k)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Attorney-performance row click → open that attorney's manage/edit panel.
  const openAttorneyFromLeaderboard = (attorneyId: string) => {
    const mem = members.find((m: any) => m.attorney?.id === attorneyId)
    if (canSeeTab('team')) goToTab('team', { people: 'attorneys' })
    if (mem) {
      openEditMember(mem)
      return
    }
    const att = attorneyById.get(attorneyId)
    if (att) startEditAttorney(att)
  }

  const leadIdByAssessment = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of cases) if (c.leadId) m.set(c.assessmentId, c.leadId)
    return m
  }, [cases])

  const unassignedCount = useMemo(() => cases.filter((c) => c.unassigned).length, [cases])

  // Office id → name, for showing where each case sits in the caseload view.
  const officeNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const o of dashboardData?.offices || []) m.set(o.id, o.name)
    return m
  }, [dashboardData?.offices])

  // Everyone who owns or collaborates on at least one case (by name), so the
  // admin can filter the caseload down to a single person and see their book.
  const caseloadPeople = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of cases) {
      const names = new Set<string>()
      if (c.primaryAttorney?.name) names.add(c.primaryAttorney.name)
      for (const a of c.assignments || []) if (a.name) names.add(a.name)
      for (const n of names) counts.set(n, (counts.get(n) || 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [cases])

  const caseloadFiltered = useMemo(() => {
    let list = cases
    if (caseloadMember !== 'all') {
      list = list.filter(
        (c) =>
          c.primaryAttorney?.name === caseloadMember ||
          (c.assignments || []).some((a) => a.name === caseloadMember),
      )
    }
    const q = caseloadQuery.trim().toLowerCase()
    if (q) {
      list = list.filter((c) =>
        [c.clientName, c.claimType, c.venueCounty, c.venueState, c.leadStatus, c.primaryAttorney?.name, ...(c.assignments || []).map((a) => a.name)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
    }
    return list
  }, [cases, caseloadMember, caseloadQuery])

  // Per-owner rollup (active total + how many have open tasks) for the summary strip.
  const caseloadByOwner = useMemo(() => {
    const map = new Map<string, { name: string; total: number; withTasks: number }>()
    for (const c of cases) {
      const name = c.primaryAttorney?.name || 'Unassigned'
      const entry = map.get(name) || { name, total: 0, withTasks: 0 }
      entry.total += 1
      if ((c.openTaskCount || 0) > 0) entry.withTasks += 1
      map.set(name, entry)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
  }, [cases])

  const visibleCases = useMemo(() => {
    let list = cases
    if (caseFilter === 'unassigned') list = list.filter((c) => c.unassigned)
    const q = caseQuery.trim().toLowerCase()
    if (q) {
      list = list.filter((c) =>
        [c.clientName, c.claimType, c.venueCounty, c.venueState, c.leadStatus, c.primaryAttorney?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
    }
    return list
  }, [cases, caseFilter, caseQuery])

  const visibleOps = useMemo(() => {
    let list = operationsQueue
    if (opPriority !== 'all') list = list.filter((t) => (t.priority || '').toLowerCase() === opPriority)
    const q = opQuery.trim().toLowerCase()
    if (q) {
      list = list.filter((t) =>
        [t.title, t.caseType, t.venueCounty, t.assignedRole, t.assignedTo].filter(Boolean).join(' ').toLowerCase().includes(q),
      )
    }
    return list
  }, [operationsQueue, opPriority, opQuery])

  const leaderboard = useMemo(() => {
    return [...attorneys]
      .map((a) => ({
        id: a.id,
        name: a.name,
        accepted: a.dashboard?.totalLeadsAccepted ?? 0,
        fees: a.dashboard?.feesCollectedFromPayments ?? 0,
        responseTimeHours: a.responseTimeHours ?? 0,
        rating: a.averageRating ?? 0,
      }))
      .sort((x, y) => y.fees - x.fees || y.accepted - x.accepted)
  }, [attorneys])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-brand-600" />
          <p className="mt-4 text-slate-600">Loading firm dashboard…</p>
        </div>
      </div>
    )
  }

  if (error === 'No law firm associated with this attorney') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-medium text-amber-900">Firm dashboard is not set up yet</h3>
          </div>
          <p className="mt-2 text-sm text-amber-800">This attorney account is not linked to a law firm, so firm-level team management is unavailable.</p>
          <button type="button" onClick={() => navigate('/attorney-dashboard')} className="mt-4 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">
            Back to Attorney Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-medium text-red-800">Error</h3>
          </div>
          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  if (!dashboardData) return null

  const maxTeamCaseload = Math.max(1, ...(caseload?.teams || []).map((t) => t.activeCaseCount))

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <BackButton onClick={goBack} label="Back" />

      {/* Firm header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100">
            <Building2 className="h-8 w-8 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{firm.name}</h1>
            <p className="text-sm text-slate-500">
              {firm.city && firm.state ? `${firm.city}, ${firm.state}` : 'Firm workspace'}
              {workspace?.currentRole ? ` · ${formatRole(workspace.currentRole)}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToTab('team', { people: 'attorneys' })}
            disabled={!canSeeTab('team')}
            className="disabled:cursor-default"
            title={canSeeTab('team') ? 'View attorneys' : undefined}
          >
            <Badge tone="brand">{metrics.attorneyCount} attorneys</Badge>
          </button>
          <button
            type="button"
            onClick={() => goToTab('caseload')}
            disabled={!canSeeTab('caseload')}
            className="disabled:cursor-default"
            title={canSeeTab('caseload') ? 'Open caseload' : undefined}
          >
            <Badge tone="blue">{metrics.activeCases || 0} cases</Badge>
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5">
        {visibleTabs.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex flex-auto items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                active ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* OVERVIEW                                                          */}
      {/* ---------------------------------------------------------------- */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <StatGrid columns={4}>
            <FilterStat
              filled
              tone="brand"
              value={metrics.attorneyCount}
              label="Attorneys"
              onClick={canSeeTab('team') ? () => goToTab('team', { people: 'attorneys' }) : undefined}
              hint={canSeeTab('team') ? 'View attorneys in Team & Roles' : undefined}
            />
            <FilterStat
              filled
              tone="blue"
              value={metrics.activeCases || 0}
              label="Active cases"
              onClick={canSeeTab('caseload') ? () => goToTab('caseload') : undefined}
              hint={canSeeTab('caseload') ? 'Open the active caseload' : undefined}
            />
            <FilterStat
              filled
              tone="success"
              value={formatCurrency(metrics.feesCollectedFromPayments)}
              label="Fees collected"
              onClick={canSeeTab('time') ? () => goToTab('time') : undefined}
              hint={canSeeTab('time') ? 'Open Time & Billing' : undefined}
            />
            <FilterStat filled tone="warning" value={metrics.firmROI != null ? `${metrics.firmROI.toFixed(1)}x` : '—'} label="Marketing ROI" />
          </StatGrid>
          <StatGrid columns={4}>
            <FilterStat
              value={metrics.totalLeadsReceived}
              label="Leads received"
              onClick={canSeeTab('caseload') ? () => goToTab('caseload') : undefined}
              hint={canSeeTab('caseload') ? 'See cases in the caseload' : undefined}
            />
            <FilterStat
              value={metrics.acceptedCases || 0}
              label="Accepted"
              onClick={canSeeTab('caseload') ? () => goToTab('caseload') : undefined}
              hint={canSeeTab('caseload') ? 'See cases in the caseload' : undefined}
            />
            <FilterStat
              value={metrics.retainedCases || 0}
              label="Retained"
              onClick={canSeeTab('caseload') ? () => goToTab('caseload') : undefined}
              hint={canSeeTab('caseload') ? 'See cases in the caseload' : undefined}
            />
            <FilterStat
              value={metrics.avgAttorneyRating ? metrics.avgAttorneyRating.toFixed(1) : 'N/A'}
              label="Avg. rating"
              onClick={canSeeTab('team') ? () => goToTab('team', { people: 'attorneys' }) : undefined}
              hint={canSeeTab('team') ? 'View attorneys in Team & Roles' : undefined}
            />
          </StatGrid>

          {unassignedCount > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>
                  <strong>{unassignedCount}</strong> {unassignedCount === 1 ? 'case has' : 'cases have'} no owner assigned yet.
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard title="Team workload" trailing={<Gauge className="h-4 w-4 text-slate-400" />}>
              {(caseload?.teams || []).length === 0 ? (
                <EmptyState message="No teams yet. Add teams to track workload distribution." />
              ) : (
                <div className="space-y-3">
                  {(caseload?.teams || []).map((t) => (
                    <button
                      key={t.teamId}
                      type="button"
                      onClick={() => goToTab('caseload')}
                      disabled={!canSeeTab('caseload')}
                      className={`block w-full text-left ${canSeeTab('caseload') ? 'group rounded-lg -mx-2 px-2 py-1 transition hover:bg-slate-50' : 'cursor-default'}`}
                      title={canSeeTab('caseload') ? 'Open caseload' : undefined}
                    >
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className={`font-medium text-slate-700 ${canSeeTab('caseload') ? 'group-hover:text-brand-700' : ''}`}>
                          {t.name} <span className="text-slate-400">· {t.memberCount} {t.memberCount === 1 ? 'member' : 'members'}</span>
                        </span>
                        <span className="font-semibold text-slate-800">{t.activeCaseCount} cases</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.round((t.activeCaseCount / maxTeamCaseload) * 100)}%` }} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Office capacity" trailing={<Building2 className="h-4 w-4 text-slate-400" />}>
              {(caseload?.offices || []).length === 0 ? (
                <EmptyState message="No offices yet. Add offices with a capacity to track utilization." />
              ) : (
                <div className="space-y-3">
                  {(caseload?.offices || []).map((o) => {
                    const util = o.utilization ?? null
                    const tone = util == null ? 'bg-slate-300' : util >= 90 ? 'bg-rose-500' : util >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    return (
                      <button
                        key={o.officeId}
                        type="button"
                        onClick={() => goToTab('caseload')}
                        disabled={!canSeeTab('caseload')}
                        className={`block w-full text-left ${canSeeTab('caseload') ? 'group rounded-lg -mx-2 px-2 py-1 transition hover:bg-slate-50' : 'cursor-default'}`}
                        title={canSeeTab('caseload') ? 'Open caseload' : undefined}
                      >
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className={`font-medium text-slate-700 ${canSeeTab('caseload') ? 'group-hover:text-brand-700' : ''}`}>{o.name}</span>
                          <span className="font-semibold text-slate-800">
                            {o.assignedCases}
                            {o.capacity ? ` / ${o.capacity}` : ''} {util != null && <span className="text-slate-400">({util}%)</span>}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, util ?? Math.min(100, o.assignedCases * 10))}%` }} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          {(caseload?.offices || []).length >= 2 && cases.length > 0 && (
            <SectionCard
              title="Case assignment by office"
              trailing={<Badge tone="neutral">{cases.length} active</Badge>}
            >
              <p className="mb-3 text-xs text-slate-500">
                Move active cases between offices to balance capacity. Changes update the capacity meters above.
              </p>
              <div className="max-h-80 divide-y divide-slate-50 overflow-y-auto rounded-lg border border-slate-100">
                {cases.map((c) => (
                  <div key={c.assessmentId} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">{c.clientName || (c.claimType ? formatClaimType(c.claimType) : 'Case')}</div>
                      <div className="truncate text-xs text-slate-400">
                        {c.claimType ? formatClaimType(c.claimType) : ''}
                        {c.venueCounty ? ` · ${c.venueCounty}` : ''}
                      </div>
                    </div>
                    <select
                      value={c.officeId || ''}
                      disabled={caseOfficeSavingId === c.assessmentId}
                      onChange={(e) => handleCaseOfficeChange(c.assessmentId, e.target.value)}
                      className="w-44 shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50"
                    >
                      <option value="">Unassigned</option>
                      {(caseload?.offices || []).map((o) => (
                        <option key={o.officeId} value={o.officeId}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Attorney performance" trailing={<TrendingUp className="h-4 w-4 text-slate-400" />}>
            {leaderboard.length === 0 ? (
              <EmptyState message="No attorneys yet." />
            ) : (
              <>
              {canManageUsers && (
                <p className="mb-3 text-xs text-slate-500">Click an attorney to view or edit their role, permissions, and profile.</p>
              )}
              <DataTable
                columns={[
                  {
                    key: 'name',
                    header: 'Attorney',
                    cell: (r: any) => (
                      <div className="flex items-center gap-3">
                        <Avatar name={r.name} />
                        <span className="font-medium text-slate-800">{r.name}</span>
                      </div>
                    ),
                  },
                  { key: 'accepted', header: 'Accepted', cell: (r: any) => r.accepted },
                  { key: 'fees', header: 'Fees collected', cell: (r: any) => <span className="font-medium text-slate-800">{formatCurrency(r.fees)}</span> },
                  {
                    key: 'response',
                    header: 'Response',
                    cell: (r: any) => (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />~{r.responseTimeHours}h
                        {r.responseTimeHours > 24 && <Badge tone="danger">Slow</Badge>}
                      </span>
                    ),
                  },
                  {
                    key: 'rating',
                    header: 'Rating',
                    align: 'right',
                    cell: (r: any) => (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400" />
                        {Number(r.rating || 0).toFixed(1)}
                      </span>
                    ),
                  },
                ] as DataTableColumn<any>[]}
                rows={leaderboard}
                rowKey={(r: any) => r.id}
                onRowClick={canManageUsers ? (r: any) => openAttorneyFromLeaderboard(r.id) : undefined}
              />
              </>
            )}
          </SectionCard>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* CASELOAD — who owns / is working on what                          */}
      {/* ---------------------------------------------------------------- */}
      {tab === 'newleads' && (
        <div className="space-y-6">
          <SectionCard
            title="New leads"
            trailing={
              <div className="flex items-center gap-2">
                <Badge tone="brand">{newLeads.active.length}</Badge>
                <button onClick={() => void refreshNewLeads()} className={btnGhost + ' !px-2.5 !py-1 !text-xs'}>
                  Refresh
                </button>
              </div>
            }
          >
            <p className="mb-3 text-sm text-slate-500">
              Leads routed to your firm and awaiting a response. Client identity is revealed once an attorney accepts.
            </p>
            {newLeadsError ? (
              <EmptyState message={newLeadsError} />
            ) : newLeadsLoading ? (
              <EmptyState message="Loading new leads…" />
            ) : newLeads.active.length === 0 ? (
              <EmptyState message="No new leads waiting. New matches routed to your firm will appear here." />
            ) : (
              <DataTable
                columns={newLeadColumns}
                rows={newLeads.active}
                rowKey={(r: FirmNewLead) => r.assessmentId}
              />
            )}
          </SectionCard>

          {newLeads.expired.length > 0 && (
            <SectionCard
              title="Expired leads"
              trailing={<Badge tone="warning">{newLeads.expired.length}</Badge>}
            >
              <p className="mb-3 text-sm text-slate-500">
                Offers whose response window lapsed and re-routed to other attorneys. Kept here for visibility (CP-592).
              </p>
              <DataTable
                columns={newLeadColumns}
                rows={newLeads.expired}
                rowKey={(r: FirmNewLead) => r.assessmentId}
              />
            </SectionCard>
          )}
        </div>
      )}

      {tab === 'caseload' && (
        <div className="space-y-6">
          {caseloadByOwner.length > 0 && (
            <SectionCard title="Caseload by attorney" trailing={<Badge tone="neutral">{cases.length} active</Badge>}>
              <div className="flex flex-wrap gap-2">
                {caseloadByOwner.map((o) => {
                  const active = caseloadMember === o.name
                  return (
                    <button
                      key={o.name}
                      onClick={() => setCaseloadMember(active ? 'all' : o.name)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                        active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300'
                      }`}
                    >
                      <Avatar name={o.name} />
                      <span>
                        <span className="block font-medium leading-tight">{o.name}</span>
                        <span className="block text-xs text-slate-400">
                          {o.total} {o.total === 1 ? 'case' : 'cases'}
                          {o.withTasks > 0 ? ` · ${o.withTasks} with open tasks` : ''}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </SectionCard>
          )}

          <SectionCard
            title="Team caseload"
            trailing={<Badge tone="brand">{caseloadFiltered.length}</Badge>}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <select
                value={caseloadMember}
                onChange={(e) => setCaseloadMember(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="all">All members</option>
                {caseloadPeople.map((p) => (
                  <option key={p.name} value={p.name}>{p.name} ({p.count})</option>
                ))}
              </select>
              <div className="relative flex-1 min-w-[180px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={caseloadQuery}
                  onChange={(e) => setCaseloadQuery(e.target.value)}
                  placeholder="Search cases, clients, venues…"
                  className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
              {caseloadMember !== 'all' && (
                <button onClick={() => setCaseloadMember('all')} className={btnGhost + ' !px-2.5 !py-1 !text-xs'}>
                  Clear filter
                </button>
              )}
            </div>

            {caseloadFiltered.length === 0 ? (
              <EmptyState message={caseloadMember === 'all' ? 'No active cases yet.' : `No cases for ${caseloadMember}.`} />
            ) : (
              <DataTable
                columns={[
                  {
                    key: 'case',
                    header: 'Case',
                    cell: (c: any) => (
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-800">{c.clientName || (c.claimType ? formatClaimType(c.claimType) : 'Case')}</div>
                        <div className="truncate text-xs text-slate-400">
                          {c.claimType ? formatClaimType(c.claimType) : ''}
                          {c.venueCounty ? ` · ${c.venueCounty}` : ''}
                          {c.venueState ? `, ${c.venueState}` : ''}
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'owner',
                    header: 'Owner',
                    cell: (c: any) =>
                      c.primaryAttorney?.name ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={c.primaryAttorney.name} />
                          <span className="text-slate-700">{c.primaryAttorney.name}</span>
                        </div>
                      ) : (
                        <Badge tone="warning">Unassigned</Badge>
                      ),
                  },
                  {
                    key: 'team',
                    header: 'Working on it',
                    cell: (c: any) => {
                      const collaborators = (c.assignments || []).filter((a: any) => a.name && a.name !== c.primaryAttorney?.name)
                      if (collaborators.length === 0) return <span className="text-slate-300">—</span>
                      return (
                        <div className="flex flex-wrap gap-1">
                          {collaborators.slice(0, 4).map((a: any, i: number) => (
                            <span key={`${a.name}-${i}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                              {a.name}<span className="text-slate-400"> · {formatRole(a.role)}</span>
                            </span>
                          ))}
                          {collaborators.length > 4 && <span className="text-xs text-slate-400">+{collaborators.length - 4}</span>}
                        </div>
                      )
                    },
                  },
                  { key: 'stage', header: 'Stage', cell: (c: any) => <Badge tone={statusTone(c.leadStatus)}>{titleCase(c.leadStatus)}</Badge> },
                  {
                    key: 'tasks',
                    header: 'Open tasks',
                    align: 'center',
                    cell: (c: any) => (c.openTaskCount > 0 ? <Badge tone="blue">{c.openTaskCount}</Badge> : <span className="text-slate-300">0</span>),
                  },
                  { key: 'office', header: 'Office', cell: (c: any) => <span className="text-slate-500">{(c.officeId && officeNameById.get(c.officeId)) || '—'}</span> },
                  {
                    key: 'updated',
                    header: 'Updated',
                    cell: (c: any) => <span className="text-slate-400">{c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : '—'}</span>,
                  },
                ] as DataTableColumn<any>[]}
                rows={caseloadFiltered}
                rowKey={(c: any) => c.assessmentId}
              />
            )}
          </SectionCard>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* BOOKING LINKS (round-robin / team scheduling)                     */}
      {/* ---------------------------------------------------------------- */}
      {tab === 'booking' && <FirmBookingLinksTab />}

      {/* ---------------------------------------------------------------- */}
      {/* FIRM TEMPLATES (document library + e-sign)                        */}
      {/* ---------------------------------------------------------------- */}
      {tab === 'templates' && <FirmTemplatesTab />}

      {tab === 'workflow' && <FirmWorkflowsTab />}

      {tab === 'time' && <FirmTimeBillingTab />}

      {/* ---------------------------------------------------------------- */}
      {/* TEAM & ROLES                                                      */}
      {/* ---------------------------------------------------------------- */}
      {tab === 'team' && (
        <div className="space-y-6">
          {/* ── ① PEOPLE ──────────────────────────────────────────── */}
          <SectionCard
            title="People"
            trailing={
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  {(['all', 'attorneys', 'staff'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setPeopleFilter(f)}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition ${peopleFilter === f ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <Badge tone="brand">{filteredPeople.length}</Badge>
              </div>
            }
          >
            <DataTable
              columns={[
                {
                  key: 'name',
                  header: 'Name',
                  cell: (m: any) => {
                    const userName = [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ').trim()
                    const displayName = m.attorney?.name || userName || m.user?.email || m.attorney?.email || '—'
                    const att = m.attorney?.id ? attorneyById.get(m.attorney.id) : null
                    return (
                      <button
                        type="button"
                        onClick={() => openEditMember(m)}
                        title="View & edit permissions"
                        className="group flex items-center gap-3 text-left"
                      >
                        <Avatar name={displayName} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800 group-hover:text-brand-700 group-hover:underline">{displayName}</span>
                            {m.status === 'invited' && <Badge tone="warning">Pending</Badge>}
                          </div>
                          {att ? (
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Star className="h-3 w-3 text-yellow-400" /> {Number(att.averageRating || 0).toFixed(1)} · {att.isVerified ? 'Verified' : 'Unverified'}
                            </div>
                          ) : m.title ? (
                            <div className="text-xs text-slate-400">{m.title}</div>
                          ) : null}
                        </div>
                      </button>
                    )
                  },
                },
                { key: 'role', header: 'Role', cell: (m: any) => <Badge tone={m.role === 'attorney' || m.attorney ? 'brand' : 'neutral'}>{formatRole(m.role)}</Badge> },
                {
                  key: 'specialties',
                  header: 'Specialties',
                  cell: (m: any) => {
                    const att = m.attorney?.id ? attorneyById.get(m.attorney.id) : null
                    const specs = Array.isArray(att?.specialties) ? att.specialties : []
                    if (!att || specs.length === 0) return <span className="text-slate-300">—</span>
                    return (
                      <div className="flex flex-wrap gap-1">
                        {specs.slice(0, 3).map((s: string) => (
                          <span key={s} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{String(s).replace(/_/g, ' ')}</span>
                        ))}
                        {specs.length > 3 && <span className="text-xs text-slate-400">+{specs.length - 3}</span>}
                      </div>
                    )
                  },
                },
                {
                  key: 'teams',
                  header: 'Teams',
                  cell: (m: any) => {
                    const names = teamsByMemberId.get(m.id) || []
                    if (names.length === 0) return <span className="text-slate-300">—</span>
                    return (
                      <div className="flex flex-wrap gap-1">
                        {names.slice(0, 3).map((n: string) => (
                          <span key={n} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{n}</span>
                        ))}
                        {names.length > 3 && <span className="text-xs text-slate-400">+{names.length - 3}</span>}
                      </div>
                    )
                  },
                },
                { key: 'email', header: 'Email', cell: (m: any) => <span className="text-slate-500">{m.user?.email || m.attorney?.email || '—'}</span> },
                {
                  key: 'office',
                  header: 'Office',
                  cell: (m: any) => (
                    <select
                      value={m.office?.id || ''}
                      disabled={memberOfficeSavingId === m.id || offices.length === 0}
                      onChange={(e) => handleMemberOfficeChange(m.id, e.target.value)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                      title={offices.length === 0 ? 'Add an office first (Team & Roles → Offices)' : 'Move to office'}
                    >
                      <option value="">{offices.length === 0 ? 'No offices' : 'Unassigned'}</option>
                      {offices.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  cell: (m: any) => {
                    const st = m.status || 'active'
                    const tone = st === 'active' ? 'success' : st === 'invited' ? 'warning' : 'neutral'
                    return <Badge tone={tone}>{st === 'active' ? 'Active' : st === 'invited' ? 'Pending' : 'Suspended'}</Badge>
                  },
                },
                {
                  key: 'action',
                  header: '',
                  align: 'right',
                  cell: (m: any) => {
                    const att = m.attorney?.id ? attorneyById.get(m.attorney.id) : null
                    return (
                      <div className="flex items-center justify-end gap-2">
                        {m.status === 'invited' && (
                          <button
                            onClick={() => handleResendInvite(m.id)}
                            disabled={resendingMemberId === m.id}
                            className={btnGhost + ' !px-2.5 !py-1 !text-xs disabled:opacity-60'}
                          >
                            {resendingMemberId === m.id ? 'Sending…' : 'Resend invite'}
                          </button>
                        )}
                        {att && (
                          <button onClick={() => startEditAttorney(att)} className={btnGhost + ' !px-2.5 !py-1 !text-xs'}>Edit profile</button>
                        )}
                        <button
                          onClick={() => openEditMember(m)}
                          className={btnGhost + ' !px-2.5 !py-1 !text-xs'}
                          title="Edit role & permissions"
                        >
                          <Shield className="mr-1 inline h-3.5 w-3.5" />
                          Manage
                        </button>
                      </div>
                    )
                  },
                },
              ] as DataTableColumn<any>[]}
              rows={filteredPeople}
              rowKey={(m: any) => m.id}
              emptyMessage={peopleFilter === 'attorneys' ? 'No attorneys yet. Add one below.' : peopleFilter === 'staff' ? 'No staff yet. Add someone below.' : 'No team members yet. Add attorneys or support staff below.'}
            />
          </SectionCard>

          {/* Add a person (attorney or staff) */}
          <SectionCard title="Add a person">
            <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {(['attorney', 'staff'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAddPersonType(t)}
                  className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${addPersonType === t ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {t === 'attorney' ? 'Attorney' : 'Staff'}
                </button>
              ))}
            </div>

            {addPersonType === 'staff' ? (
              <form onSubmit={handleAddStaffMember} className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input type="text" value={newMember.firstName} onChange={(e) => setNewMember({ ...newMember, firstName: e.target.value })} placeholder="First name" maxLength={NAME_MAX} className={inputCls} />
                  <input type="text" value={newMember.lastName} onChange={(e) => setNewMember({ ...newMember, lastName: e.target.value })} placeholder="Last name" maxLength={NAME_MAX} className={inputCls} />
                </div>
                <input type="email" value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} placeholder="Email" maxLength={EMAIL_MAX} className={inputCls} required />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select value={newMember.role} onChange={(e) => setNewMember({ ...newMember, role: e.target.value })} className={inputCls}>
                    {FIRM_ROLES.filter((role) => role.value !== 'attorney').map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                  <select value={newMember.officeId} onChange={(e) => setNewMember({ ...newMember, officeId: e.target.value })} className={inputCls}>
                    <option value="">No Office (unassigned)</option>
                    {offices.map((office) => (
                      <option key={office.id} value={office.id}>{office.name}</option>
                    ))}
                  </select>
                </div>
                <input type="text" value={newMember.title} onChange={(e) => setNewMember({ ...newMember, title: e.target.value })} placeholder="Title, e.g. Senior Case Manager" maxLength={NAME_MAX} className={inputCls} />
                {memberError && <p className="text-sm text-red-600">{memberError}</p>}
                {memberSuccess && <p className="text-sm text-green-600">{memberSuccess}</p>}
                <button type="submit" disabled={memberSaving} className={btnPrimary}>
                  <Plus className="h-4 w-4" />
                  {memberSaving ? 'Adding…' : 'Add staff member'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleAddAttorney} className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input type="text" value={newAttorney.firstName} onChange={(e) => setNewAttorney({ ...newAttorney, firstName: e.target.value })} placeholder="First name" maxLength={NAME_MAX} className={inputCls} />
                  <input type="text" value={newAttorney.middleName} onChange={(e) => setNewAttorney({ ...newAttorney, middleName: e.target.value })} placeholder="Middle name" maxLength={NAME_MAX} className={inputCls} />
                  <input type="text" value={newAttorney.lastName} onChange={(e) => setNewAttorney({ ...newAttorney, lastName: e.target.value })} placeholder="Last name" maxLength={NAME_MAX} className={inputCls} />
                </div>
                <input type="email" value={newAttorney.email} onChange={(e) => setNewAttorney({ ...newAttorney, email: e.target.value })} placeholder="Attorney email" maxLength={EMAIL_MAX} className={inputCls} required />
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-700">Specialties *</label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newAttorney.specialties.length === CASE_TYPES.length}
                        ref={(el) => { if (el) el.indeterminate = newAttorney.specialties.length > 0 && newAttorney.specialties.length < CASE_TYPES.length }}
                        onChange={() => setNewAttorney((prev) => ({ ...prev, specialties: prev.specialties.length === CASE_TYPES.length ? [] : CASE_TYPES.map((t) => t.value) }))}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-xs font-semibold text-slate-600">Select all</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {CASE_TYPES.map((type) => (
                      <label key={type.value} className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={newAttorney.specialties.includes(type.value)} onChange={() => toggleAttorneyArrayValue('specialties', type.value)} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                        <span className="text-sm text-slate-700">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Jurisdictions (States) * <span className="ml-2 text-xs font-normal text-slate-500">({newAttorney.jurisdictions.length} selected)</span>
                  </label>
                  <StateMultiSelect
                    value={newAttorney.jurisdictions}
                    onChange={(next) => setNewAttorney((prev) => ({ ...prev, jurisdictions: next }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Office</label>
                  <select value={newAttorney.officeId} onChange={(e) => setNewAttorney({ ...newAttorney, officeId: e.target.value })} className={inputCls}>
                    <option value="">No Office (unassigned)</option>
                    {offices.map((office) => (
                      <option key={office.id} value={office.id}>{office.name}</option>
                    ))}
                  </select>
                </div>
                {addError && <p className="text-sm text-red-600">{addError}</p>}
                {addSuccess && <p className="text-sm text-green-600">{addSuccess}</p>}
                <button type="submit" disabled={adding} className={btnPrimary}>
                  <Plus className="h-4 w-4" />
                  {adding ? 'Adding…' : 'Add attorney'}
                </button>
              </form>
            )}
          </SectionCard>

          {/* Offices & Teams */}
          {teamOfficeError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{teamOfficeError}</p>
          )}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard title="Offices" trailing={<Badge tone="neutral">{offices.length}</Badge>}>
              {offices.length > 0 && (
                <ul className="mb-3 space-y-1.5">
                  {offices.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className="font-medium text-slate-700">{o.name}</span>
                        <span className="ml-2 text-slate-400">{[o.city, o.state].filter(Boolean).join(', ') || '—'}{o.capacity ? ` · cap ${o.capacity}` : ''}</span>
                      </span>
                      {canManageRouting && (
                        <span className="flex shrink-0 items-center gap-1">
                          <button type="button" onClick={() => openEditOffice(o)} title="Edit office" className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => handleDeleteOffice(o)} title="Delete office" className="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={handleAddOffice} className="space-y-3">
                <input type="text" value={newOffice.name} onChange={(e) => setNewOffice({ ...newOffice, name: e.target.value })} placeholder="Office name, e.g. Los Angeles" maxLength={NAME_MAX} className={inputCls} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={newOffice.city} onChange={(e) => setNewOffice({ ...newOffice, city: e.target.value })} placeholder="City" maxLength={NAME_MAX} className={inputCls} />
                  <select value={newOffice.state} onChange={(e) => setNewOffice({ ...newOffice, state: e.target.value })} className={inputCls}>
                    <option value="">State</option>
                    {US_STATES.map((state) => (
                      <option key={state.code} value={state.code}>{state.code}</option>
                    ))}
                  </select>
                </div>
                <input type="number" min={0} step={1} value={newOffice.capacity} onChange={(e) => setNewOffice({ ...newOffice, capacity: e.target.value })} placeholder="Capacity (optional)" className={inputCls} />
                {officeError && <p className="text-sm text-red-600">{officeError}</p>}
                {officeSuccess && <p className="text-sm text-green-600">{officeSuccess}</p>}
                <button type="submit" disabled={officeSaving} className={btnPrimary}>
                  <Plus className="h-4 w-4" />
                  {officeSaving ? 'Adding…' : 'Add office'}
                </button>
              </form>
            </SectionCard>

            <SectionCard title="Teams" trailing={<Badge tone="neutral">{teams.length}</Badge>}>
              {teams.length > 0 && (
                <ul className="mb-3 space-y-2">
                  {teams.map((t) => {
                    const memberIdsInTeam = new Set((t.members || []).map((m) => m.firmMemberId || m.id))
                    const available = members.filter((m: any) => !memberIdsInTeam.has(m.id))
                    const isOpen = manageTeamId === t.id
                    return (
                      <li key={t.id} className="rounded-lg border border-slate-100">
                        <div className="flex items-center justify-between px-3 py-2 text-sm">
                          <div className="min-w-0">
                            <span className="font-medium text-slate-700">{t.name}</span>
                            <span className="ml-2 text-slate-400">{formatRole(t.teamType)}{t.office ? ` · ${t.office.name}` : ''} · {t.members.length} {t.members.length === 1 ? 'member' : 'members'}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => { setManageTeamId(isOpen ? null : t.id); setTeamMemberPick({ firmMemberId: '', role: 'member' }); setTeamMemberError(null) }}
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                              {isOpen ? 'Done' : 'Manage members'}
                            </button>
                            {canManageUsers && (
                              <>
                                <button type="button" onClick={() => openEditTeam(t)} title="Edit team" className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button type="button" onClick={() => handleDeleteTeam(t)} title="Delete team" className="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {isOpen && (
                          <div className="space-y-3 border-t border-slate-100 px-3 py-3">
                            {(t.members || []).length > 0 ? (
                              <ul className="space-y-1.5">
                                {t.members.map((m) => (
                                  <li key={m.firmMemberId || m.id} className="flex items-center justify-between gap-2 text-sm">
                                    <span className="flex min-w-0 items-center gap-2">
                                      <Avatar name={m.name || m.email || '—'} />
                                      <span className="truncate text-slate-700">{m.name || m.email || '—'}</span>
                                      <Badge tone={m.teamRole === 'lead' ? 'brand' : 'neutral'}>{m.teamRole === 'lead' ? 'Lead' : 'Member'}</Badge>
                                    </span>
                                    <button type="button" disabled={teamMemberSaving} onClick={() => handleRemoveTeamMember(t.id, m.firmMemberId || m.id)} className="shrink-0 text-xs font-semibold text-red-600 transition hover:text-red-700 disabled:opacity-50">Remove</button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-400">No members yet. Add staff or attorneys below.</p>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={teamMemberPick.firmMemberId}
                                onChange={(e) => setTeamMemberPick({ ...teamMemberPick, firmMemberId: e.target.value })}
                                disabled={available.length === 0}
                                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60"
                              >
                                <option value="">{available.length === 0 ? 'Everyone is already on this team' : 'Add a team member…'}</option>
                                {available.map((m: any) => {
                                  const nm = [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ').trim() || m.attorney?.name || m.user?.email || m.attorney?.email || '—'
                                  return <option key={m.id} value={m.id}>{nm}{m.role ? ` · ${formatRole(m.role)}` : ''}</option>
                                })}
                              </select>
                              <select
                                value={teamMemberPick.role}
                                onChange={(e) => setTeamMemberPick({ ...teamMemberPick, role: e.target.value as 'lead' | 'member' })}
                                className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                              >
                                <option value="member">Member</option>
                                <option value="lead">Lead</option>
                              </select>
                              <button type="button" disabled={teamMemberSaving || !teamMemberPick.firmMemberId} onClick={() => handleAddTeamMember(t.id)} className={btnPrimary + ' whitespace-nowrap'}>
                                <Plus className="h-4 w-4" /> Add
                              </button>
                            </div>
                            {teamMemberError && <p className="text-xs text-red-600">{teamMemberError}</p>}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
              <form onSubmit={handleAddTeam} className="space-y-3">
                <input type="text" value={newTeam.name} onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })} placeholder="Team name, e.g. Intake Team" maxLength={NAME_MAX} className={inputCls} />
                <select value={newTeam.teamType} onChange={(e) => setNewTeam({ ...newTeam, teamType: e.target.value })} className={inputCls}>
                  {TEAM_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <select value={newTeam.officeId} onChange={(e) => setNewTeam({ ...newTeam, officeId: e.target.value })} className={inputCls}>
                  <option value="">No Office (firm-wide)</option>
                  {offices.map((office) => (
                    <option key={office.id} value={office.id}>{office.name}</option>
                  ))}
                </select>
                {teamError && <p className="text-sm text-red-600">{teamError}</p>}
                {teamSuccess && <p className="text-sm text-green-600">{teamSuccess}</p>}
                <button type="submit" disabled={teamSaving} className={btnPrimary}>
                  <Plus className="h-4 w-4" />
                  {teamSaving ? 'Adding…' : 'Add team'}
                </button>
              </form>
            </SectionCard>
          </div>

          {/* ── ③ ROLE × PERMISSION MATRIX ─────────────────────────── */}
          <SectionCard
            title="Roles & permissions"
            trailing={
              <button
                type="button"
                onClick={() => setShowRolePermissions((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-slate-700"
              >
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                {showRolePermissions ? 'Hide matrix' : 'Show matrix'}
              </button>
            }
          >
            {showRolePermissions ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">
                  What each firm role can do. Click a role name to see its full permission list.
                  {canManageUsers
                    ? ' To change what a role can do, click the Edit button next to the role (or click any cell to toggle a single permission).'
                    : ''}
                </p>
                {roleMatrixError && (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {roleMatrixError}
                  </p>
                )}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Role
                        </th>
                        {roleMatrix.columns.map((perm) => (
                          <th
                            key={perm}
                            title={PERMISSION_DESCRIPTIONS[perm] || humanizePermission(perm)}
                            className="whitespace-nowrap px-3 py-3 text-center align-bottom text-[11px] font-semibold text-slate-600"
                          >
                            {humanizePermission(perm)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {roleMatrix.roles.map((role) => {
                        const perms = roleMatrix.caps[role] || []
                        const isOpen = expandedMatrixRole === role
                        return (
                          <tr
                            key={role}
                            className={`border-t border-slate-100 transition ${isOpen ? 'bg-brand-50/50' : 'hover:bg-slate-50'}`}
                          >
                            <th
                              scope="row"
                              className={`sticky left-0 z-10 px-4 py-3 text-left ${isOpen ? 'bg-brand-50' : 'bg-white'}`}
                            >
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setExpandedMatrixRole(isOpen ? null : role)}
                                  className="flex items-center gap-1.5 text-left font-semibold text-slate-800 hover:text-brand-700"
                                >
                                  <ChevronRight
                                    className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                                  />
                                  <span className="whitespace-nowrap">{formatRole(role)}</span>
                                  <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                    {perms.length}
                                  </span>
                                </button>
                                {canManageUsers && (
                                  <button
                                    type="button"
                                    onClick={() => openEditRole(role)}
                                    title={`Edit ${formatRole(role)} permissions`}
                                    className="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700 transition hover:bg-brand-100"
                                  >
                                    <Pencil className="h-3 w-3" />
                                    Edit
                                  </button>
                                )}
                              </div>
                            </th>
                            {roleMatrix.columns.map((perm) => {
                              const has = perms.includes(perm)
                              const key = `${role}:${perm}`
                              const saving = savingRolePerm === key
                              const locked = isLockedCell(role, perm)
                              const editable = canManageUsers && !locked
                              const icon = has ? (
                                <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-500" aria-label="Allowed" />
                              ) : (
                                <XCircle className="mx-auto h-5 w-5 text-slate-300" aria-label="Not allowed" />
                              )
                              return (
                                <td key={perm} className="px-3 py-3 text-center">
                                  {editable ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleRolePermission(role, perm, has)}
                                      disabled={saving}
                                      title={has ? `Revoke "${humanizePermission(perm)}" from ${formatRole(role)}` : `Grant "${humanizePermission(perm)}" to ${formatRole(role)}`}
                                      className={`mx-auto flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-slate-100 ${saving ? 'opacity-40' : ''}`}
                                    >
                                      {icon}
                                    </button>
                                  ) : (
                                    <span title={locked ? 'Required for Firm Admin' : undefined} className={locked ? 'inline-flex items-center' : undefined}>
                                      {icon}
                                    </span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {expandedMatrixRole && (
                  <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Shield className="h-4 w-4 text-brand-600" />
                        {formatRole(expandedMatrixRole)} — permissions
                      </h4>
                      <button
                        type="button"
                        onClick={() => setExpandedMatrixRole(null)}
                        className="text-slate-400 hover:text-slate-600"
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(roleMatrix.caps[expandedMatrixRole] || []).map((perm) => (
                        <li key={perm} className="flex items-start gap-2 rounded-lg bg-white px-3 py-2 shadow-sm">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800">{humanizePermission(perm)}</p>
                            <p className="text-xs text-slate-500">{PERMISSION_DESCRIPTIONS[perm] || ''}</p>
                          </div>
                        </li>
                      ))}
                      {(roleMatrix.caps[expandedMatrixRole] || []).length === 0 && (
                        <li className="text-sm text-slate-400">This role has no permissions yet.</li>
                      )}
                    </ul>
                    <p className="mt-3 text-xs text-slate-500">
                      These are the defaults for the role. To grant or remove a specific permission for one person, open that
                      member and use <span className="font-medium">Manage member → Permissions</span>.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">The permission matrix is hidden. Click "Show matrix" to review what each role can do.</p>
            )}
          </SectionCard>
        </div>
      )}

      {/* Edit team modal */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditingTeam(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Edit team</h3>
              <button onClick={() => setEditingTeam(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Team name</label>
                <input type="text" value={editTeamForm.name} maxLength={NAME_MAX} onChange={(e) => setEditTeamForm({ ...editTeamForm, name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Type</label>
                <select value={editTeamForm.teamType} onChange={(e) => setEditTeamForm({ ...editTeamForm, teamType: e.target.value })} className={inputCls}>
                  {TEAM_TYPES.map((type) => (<option key={type.value} value={type.value}>{type.label}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Office</label>
                <select value={editTeamForm.officeId} onChange={(e) => setEditTeamForm({ ...editTeamForm, officeId: e.target.value })} className={inputCls}>
                  <option value="">No office (firm-wide)</option>
                  {offices.map((office) => (<option key={office.id} value={office.id}>{office.name}</option>))}
                </select>
              </div>
              {teamOfficeError && <p className="text-sm text-red-600">{teamOfficeError}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
              <button onClick={() => setEditingTeam(null)} className={btnGhost}>Cancel</button>
              <button onClick={submitEditTeam} disabled={teamEditSaving} className={btnPrimary}>{teamEditSaving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit office modal */}
      {editingOffice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditingOffice(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Edit office</h3>
              <button onClick={() => setEditingOffice(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Office name</label>
                <input type="text" value={editOfficeForm.name} maxLength={NAME_MAX} onChange={(e) => setEditOfficeForm({ ...editOfficeForm, name: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={editOfficeForm.city} onChange={(e) => setEditOfficeForm({ ...editOfficeForm, city: e.target.value })} placeholder="City" maxLength={NAME_MAX} className={inputCls} />
                <select value={editOfficeForm.state} onChange={(e) => setEditOfficeForm({ ...editOfficeForm, state: e.target.value })} className={inputCls}>
                  <option value="">State</option>
                  {US_STATES.map((state) => (<option key={state.code} value={state.code}>{state.code}</option>))}
                </select>
              </div>
              <input type="text" value={editOfficeForm.address} onChange={(e) => setEditOfficeForm({ ...editOfficeForm, address: e.target.value })} placeholder="Address (optional)" className={inputCls} />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={editOfficeForm.phone} onChange={(e) => setEditOfficeForm({ ...editOfficeForm, phone: e.target.value })} placeholder="Phone (optional)" className={inputCls} />
                <input type="number" min={0} step={1} value={editOfficeForm.capacity} onChange={(e) => setEditOfficeForm({ ...editOfficeForm, capacity: e.target.value })} placeholder="Capacity" className={inputCls} />
              </div>
              {teamOfficeError && <p className="text-sm text-red-600">{teamOfficeError}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
              <button onClick={() => setEditingOffice(null)} className={btnGhost}>Cancel</button>
              <button onClick={submitEditOffice} disabled={officeEditSaving} className={btnPrimary}>{officeEditSaving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit role permissions modal */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditingRole(null)}>
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{formatRole(editingRole)} permissions</h3>
                <p className="text-xs text-slate-500">Check what this role can do across the firm.</p>
              </div>
              <button onClick={() => setEditingRole(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-5 py-4">
              {permissionCatalog.map((perm) => {
                const checked = editRolePerms.includes(perm)
                const locked = isLockedCell(editingRole, perm)
                return (
                  <label
                    key={perm}
                    className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
                      checked ? 'border-brand-200 bg-brand-50/50' : 'border-slate-200 bg-white'
                    } ${locked ? 'opacity-70' : 'cursor-pointer hover:border-brand-200'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={locked}
                      onChange={() => toggleEditRolePerm(perm)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800">
                        {humanizePermission(perm)}
                        {locked && <span className="ml-2 text-[10px] font-semibold uppercase text-slate-400">Required</span>}
                      </span>
                      {(PERMISSION_DESCRIPTIONS[perm] || '') && (
                        <span className="block text-xs text-slate-500">{PERMISSION_DESCRIPTIONS[perm]}</span>
                      )}
                    </span>
                  </label>
                )
              })}
              {roleMatrixError && <p className="text-sm text-rose-600">{roleMatrixError}</p>}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
              <span className="text-xs text-slate-500">{editRolePerms.length} permission{editRolePerms.length === 1 ? '' : 's'} selected</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setEditingRole(null)} className={btnGhost}>Cancel</button>
                <button onClick={submitEditRole} disabled={roleSaving} className={btnPrimary}>{roleSaving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign case modal */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAssignTarget(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Assign case</h3>
              <button onClick={() => setAssignTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <div className="font-medium text-slate-800">{assignTarget.clientName || (assignTarget.claimType ? formatClaimType(assignTarget.claimType) : 'Case')}</div>
                <div className="text-xs text-slate-400">{assignTarget.claimType ? formatClaimType(assignTarget.claimType) : ''}{assignTarget.venueCounty ? ` · ${assignTarget.venueCounty}` : ''}</div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
                <select value={assignRole} onChange={(e) => setAssignRole(e.target.value)} className={inputCls}>
                  {assignmentRoles.map((r) => (
                    <option key={r} value={r}>{formatRole(r)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Assign to</label>
                <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={inputCls}>
                  <option value="">Select a team member…</option>
                  {attorneys.length > 0 && (
                    <optgroup label="Attorneys">
                      {attorneys.map((a) => (
                        <option key={`att:${a.id}`} value={`att:${a.id}`}>{a.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {members.filter((m) => m.user?.id && !m.attorney).length > 0 && (
                    <optgroup label="Staff">
                      {members
                        .filter((m) => m.user?.id && !m.attorney)
                        .map((m) => {
                          const name = [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ').trim() || m.user?.email || 'Member'
                          return (
                            <option key={`usr:${m.user!.id}`} value={`usr:${m.user!.id}`}>{name} — {formatRole(m.role)}</option>
                          )
                        })}
                    </optgroup>
                  )}
                </select>
              </div>
              {assignError && <p className="text-sm text-red-600">{assignError}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
              <button onClick={() => setAssignTarget(null)} className={btnGhost}>Cancel</button>
              <button onClick={submitAssign} disabled={assignSaving} className={btnPrimary}>
                {assignSaving ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MEMBER: Role & Permissions modal ───────────────────── */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditingMember(null)}>
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Manage member</h3>
                <p className="mt-0.5 text-sm text-slate-500">{editingMember.user?.email || editingMember.attorney?.email || '—'}</p>
              </div>
              <button onClick={() => setEditingMember(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="max-h-[68vh] space-y-5 overflow-y-auto px-6 py-5">
              {/* Role */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Role</label>
                <select value={editMemberRole} onChange={(e) => setEditMemberRole(e.target.value)} className={inputCls}>
                  {FIRM_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  This role determines the base set of permissions for this user.
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Title (optional)</label>
                <input type="text" value={editMemberTitle} onChange={(e) => setEditMemberTitle(e.target.value)} placeholder="e.g. Senior Paralegal" maxLength={120} className={inputCls} />
              </div>

              {/* Permission matrix */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  <Shield className="mr-1.5 inline h-4 w-4 text-brand-500" />
                  Permissions
                </label>
                <p className="mb-3 text-xs text-slate-400">
                  Permissions from the selected role (marked <span className="font-semibold text-brand-600">Role</span>) are always granted. Check any others to give this person extra access on top of their role.
                </p>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {ALL_PERMISSIONS.map((perm) => {
                    const isRoleDefault = roleDefaultPerms.includes(perm)
                    const isOverride = editMemberPermOverrides.includes(perm)
                    const isActive = isRoleDefault || isOverride
                    return (
                      <label
                        key={perm}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                          isActive ? 'bg-brand-50 text-brand-800' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => {
                            if (isRoleDefault && !isOverride) return
                            togglePermOverride(perm)
                          }}
                          disabled={isRoleDefault && !isOverride}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-40"
                        />
                        <span className="flex-1">{perm.replace(/_/g, ' ')}</span>
                        {isRoleDefault && <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-600">Role</span>}
                        {!isRoleDefault && isOverride && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-600">Extra</span>}
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Status / Suspend / Remove */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">Account controls</p>
                <div className="flex flex-wrap items-center gap-2">
                  {(editingMember.status || 'active') === 'active' ? (
                    <button
                      onClick={() => handleToggleMemberStatus('suspended')}
                      disabled={editMemberSaving}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm transition hover:bg-amber-50 disabled:opacity-50"
                    >
                      <Ban className="h-3.5 w-3.5" /> Suspend access
                    </button>
                  ) : editingMember.status === 'suspended' ? (
                    <button
                      onClick={() => handleToggleMemberStatus('active')}
                      disabled={editMemberSaving}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-white px-3 py-1.5 text-xs font-semibold text-green-700 shadow-sm transition hover:bg-green-50 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Reactivate
                    </button>
                  ) : null}
                  {!confirmRemoveMember ? (
                    <button
                      onClick={() => setConfirmRemoveMember(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove from firm
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600 font-medium">Are you sure?</span>
                      <button
                        onClick={handleRemoveMember}
                        disabled={editMemberSaving}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                      >
                        {editMemberSaving ? 'Removing…' : 'Yes, remove'}
                      </button>
                      <button
                        onClick={() => setConfirmRemoveMember(false)}
                        className="text-xs font-medium text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {editMemberError && <p className="text-sm text-red-600">{editMemberError}</p>}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setEditingMember(null)} className={btnGhost}>Cancel</button>
              <button onClick={handleSaveMember} disabled={editMemberSaving} className={btnPrimary}>
                {editMemberSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit attorney modal */}
      {editingAttorneyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Edit attorney</h3>
              <button type="button" onClick={() => setEditingAttorneyId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input type="text" value={editAttorney.firstName} onChange={(e) => setEditAttorney({ ...editAttorney, firstName: e.target.value })} placeholder="First name" maxLength={NAME_MAX} className={inputCls} />
                <input type="text" value={editAttorney.middleName} onChange={(e) => setEditAttorney({ ...editAttorney, middleName: e.target.value })} placeholder="Middle name" maxLength={NAME_MAX} className={inputCls} />
                <input type="text" value={editAttorney.lastName} onChange={(e) => setEditAttorney({ ...editAttorney, lastName: e.target.value })} placeholder="Last name" maxLength={NAME_MAX} className={inputCls} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">Specialties *</label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editAttorney.specialties.length === CASE_TYPES.length}
                      ref={(el) => { if (el) el.indeterminate = editAttorney.specialties.length > 0 && editAttorney.specialties.length < CASE_TYPES.length }}
                      onChange={() => setEditAttorney((prev) => ({ ...prev, specialties: prev.specialties.length === CASE_TYPES.length ? [] : CASE_TYPES.map((t) => t.value) }))}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-xs font-semibold text-slate-600">Select all</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {CASE_TYPES.map((type) => (
                    <label key={type.value} className="flex cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={editAttorney.specialties.includes(type.value)} onChange={() => toggleEditArrayValue('specialties', type.value)} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                      <span className="text-sm text-slate-700">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Jurisdictions (States) * <span className="ml-2 text-xs font-normal text-slate-500">({editAttorney.jurisdictions.length} selected)</span>
                </label>
                <StateMultiSelect
                  value={editAttorney.jurisdictions}
                  onChange={(next) => setEditAttorney((prev) => ({ ...prev, jurisdictions: next }))}
                />
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button type="button" onClick={() => setEditingAttorneyId(null)} className={btnGhost}>Cancel</button>
              <button type="button" onClick={handleSaveEditAttorney} disabled={editSaving} className={btnPrimary}>
                {editSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
