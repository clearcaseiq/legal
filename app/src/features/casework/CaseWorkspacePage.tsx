import { type ComponentType, type ReactNode, Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  Gavel,
  Handshake,
  Image as ImageIcon,
  Info,
  LayoutDashboard,
  ListChecks,
  Loader2,
  MapPin,
  MessageSquare,
  PartyPopper,
  PenLine,
  Pencil,
  Pill,
  Plus,
  Receipt,
  RefreshCw,
  Scale,
  Scissors,
  ScanLine,
  Search,
  Send,
  Shield,
  Sparkles,
  Stethoscope,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import {
  createDocumentRequest,
  createLeadInsurance,
  createLeadTask,
  createLeadTasksFromReadiness,
  createLeadSolTask,
  deleteLeadEvidence,
  deleteLeadTask,
  downloadEvidenceByUrl,
  getEvidenceObjectUrl,
  getAttorneyDashboard,
  getAttorneyDocumentRequests,
  getLeadCommandCenter,
  getLeadEvidenceFiles,
  getLeadMedicalChronologySummary,
  getLeadTasks,
  nudgeDocumentRequest,
  updateLeadTask,
  uploadLeadEvidenceOnBehalf,
  type AttorneyDocumentRequest,
  type CaseCommandCenter,
  type MedicalChronologySummary,
} from '../../lib/api'
import { getApiOrigin } from '../../lib/runtimeEnv'
import SignatureRequestPanel from '../../components/SignatureRequestPanel'
import ChatDrawer from '../../components/ChatDrawer'
import InsurancePanel from './InsurancePanel'
import SettlementPanel from './SettlementPanel'
import { BackButton, EmptyState } from '../shared/ui'
import { recordRecentCase } from './recentCases'

const CLAIM_LABELS: Record<string, string> = {
  auto: 'Auto',
  slip_and_fall: 'Slip & fall',
  dog_bite: 'Dog bite',
  medmal: 'Med mal',
  product: 'Product liability',
  nursing_home_abuse: 'Nursing home',
  wrongful_death: 'Wrongful death',
  high_severity_surgery: 'Surgical injury',
}

function claimLabel(type?: string) {
  if (!type) return 'Other'
  return CLAIM_LABELS[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const STATUS_LABEL: Record<string, string> = {
  submitted: 'New match',
  contacted: 'Contacted',
  consulted: 'Consult scheduled',
  retained: 'Retained',
  rejected: 'Declined',
}

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

const ROW_TONE: Record<Tone, string> = {
  neutral: 'text-slate-700',
  info: 'text-brand-700',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-rose-700',
}

const TABS = ['Overview', 'Evidence', 'Signatures', 'Medical', 'Insurance', 'Negotiation', 'Demand', 'Timeline', 'Deadlines', 'Settlement', 'Tasks'] as const
type Tab = (typeof TABS)[number]

const SECTION_TO_TAB: Record<string, Tab> = {
  overview: 'Overview',
  evidence: 'Evidence',
  signatures: 'Signatures',
  esign: 'Signatures',
  // "Send retainer" and other e-sign deep-links land on the Signatures tab.
  documents: 'Signatures',
  medical: 'Medical',
  coverage: 'Insurance',
  insurance: 'Insurance',
  negotiation: 'Negotiation',
  demand: 'Demand',
  timeline: 'Timeline',
  chronology: 'Timeline',
  deadlines: 'Deadlines',
  settlement: 'Settlement',
  billing: 'Settlement',
  tasks: 'Tasks',
}

const TAB_TO_SECTION: Record<Tab, string> = {
  Overview: 'overview',
  Evidence: 'evidence',
  Signatures: 'signatures',
  Medical: 'medical',
  Insurance: 'insurance',
  Negotiation: 'negotiation',
  Demand: 'demand',
  Timeline: 'timeline',
  Deadlines: 'deadlines',
  Settlement: 'settlement',
  Tasks: 'tasks',
}

type TabMeta = { icon: ComponentType<{ className?: string }>; blurb: string }

const TAB_META: Record<Tab, TabMeta> = {
  Overview: { icon: LayoutDashboard, blurb: 'Case status, next action, and readiness at a glance.' },
  Evidence: { icon: FolderOpen, blurb: 'Upload documents, request records, and track the case file.' },
  Signatures: { icon: PenLine, blurb: 'Send retainers and authorizations for e-signature.' },
  Medical: { icon: Stethoscope, blurb: 'Providers, treatment chronology, and cost benchmarks.' },
  Insurance: { icon: Shield, blurb: 'Insurance carriers, policy limits, adjusters, and claims.' },
  Negotiation: { icon: Handshake, blurb: 'Demands, offers, and settlement posture.' },
  Demand: { icon: Gavel, blurb: 'Demand package, case value, and policy limits.' },
  Timeline: { icon: Clock, blurb: 'A chronological record of everything on this matter.' },
  Deadlines: { icon: CalendarClock, blurb: 'Statute of limitations and key case milestones.' },
  Settlement: { icon: Scale, blurb: 'Net-to-client waterfall: fees, case costs, and lien reductions.' },
  Tasks: { icon: ListChecks, blurb: 'Open work items for this case.' },
}

// Command-center next-best-action → button label + icon on the Overview card.
const NBA_META: Record<string, { label: string; Icon: ComponentType<{ className?: string }> }> = {
  request_documents: { label: 'Request documents', Icon: FileText },
  schedule_consult: { label: 'Schedule consult', Icon: CalendarClock },
  client_follow_up: { label: 'Message client', Icon: MessageSquare },
  prepare_demand: { label: 'Open demand', Icon: Gavel },
  review_negotiation: { label: 'Review negotiation', Icon: Handshake },
}

function money(n?: number | null) {
  if (n == null || !Number.isFinite(n) || n <= 0) return '—'
  return `$${Math.round(n).toLocaleString()}`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function relativeTime(value?: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const abs = Math.abs(diff)
  const day = 86_400_000
  if (abs < day) return 'today'
  const days = Math.round(abs / day)
  const fmt = (n: number, unit: string) => (diff >= 0 ? `${n}${unit} ago` : `in ${n}${unit}`)
  if (days < 30) return fmt(days, 'd')
  const months = Math.round(days / 30)
  if (months < 12) return fmt(months, 'mo')
  return fmt(Math.round(months / 12), 'y')
}

type TimelineEvent = {
  date: string
  title: string
  detail?: string
  by: string
  category: 'intake' | 'retainer' | 'contact' | 'treatment' | 'evidence' | 'negotiation' | 'demand'
}

// Informational statute-of-limitations guidance by claim type. Intentionally a
// period description (not a computed date) — we don't have a verified incident
// date, and showing a wrong filing deadline in a legal product is dangerous.
const SOL_GUIDANCE: Record<string, string> = {
  _default: 'Typically 2 years from the date of injury for most California personal-injury claims (CCP §335.1).',
  auto: '2 years from the date of injury (CA CCP §335.1).',
  slip_and_fall: '2 years from the date of injury (CA CCP §335.1).',
  dog_bite: '2 years from the date of injury (CA CCP §335.1).',
  product: '2 years from the date of injury (CA CCP §335.1).',
  medmal: '1 year from discovery or 3 years from injury, whichever is first (CA CCP §340.5, MICRA).',
  nursing_home_abuse: '2 years for elder abuse / personal injury (CA CCP §335.1); a shorter claim window may apply against public entities.',
  wrongful_death: '2 years from the date of death (CA CCP §335.1).',
}

type TimelineCat = {
  Icon: ComponentType<{ className?: string }>
  label: string
  wrap: string
  accent: string
  chip: string
}

function TimelineStat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-bold text-slate-900">{value}</p>
      {sub ? <p className="truncate text-[11px] text-slate-400">{sub}</p> : null}
    </div>
  )
}

const TIMELINE_CATEGORY: Record<TimelineEvent['category'], TimelineCat> = {
  intake: { Icon: FileText, label: 'Intake', wrap: 'bg-brand-50 text-brand-600', accent: 'border-l-brand-400', chip: 'bg-brand-50 text-brand-700' },
  retainer: { Icon: PenLine, label: 'Retainer', wrap: 'bg-violet-50 text-violet-600', accent: 'border-l-violet-400', chip: 'bg-violet-50 text-violet-700' },
  contact: { Icon: MessageSquare, label: 'Contact', wrap: 'bg-sky-50 text-sky-600', accent: 'border-l-sky-400', chip: 'bg-sky-50 text-sky-700' },
  treatment: { Icon: Stethoscope, label: 'Treatment', wrap: 'bg-emerald-50 text-emerald-600', accent: 'border-l-emerald-400', chip: 'bg-emerald-50 text-emerald-700' },
  evidence: { Icon: FolderOpen, label: 'Evidence', wrap: 'bg-slate-100 text-slate-500', accent: 'border-l-slate-300', chip: 'bg-slate-100 text-slate-600' },
  negotiation: { Icon: Handshake, label: 'Negotiation', wrap: 'bg-amber-50 text-amber-600', accent: 'border-l-amber-400', chip: 'bg-amber-50 text-amber-700' },
  demand: { Icon: Gavel, label: 'Demand', wrap: 'bg-brand-50 text-brand-600', accent: 'border-l-brand-400', chip: 'bg-brand-50 text-brand-700' },
}

function daysOpen(value?: string | null) {
  if (!value) return '—'
  const t = Date.parse(value)
  if (Number.isNaN(t)) return '—'
  return String(Math.max(0, Math.floor((Date.now() - t) / 86_400_000)))
}

interface TaskRow {
  id: string
  title: string
  dueDate?: string | null
  reminderAt?: string | null
  status?: string | null
  priority?: string | null
  taskType?: string | null
  notes?: string | null
  completedAt?: string | null
  createdAt?: string | null
  leadId?: string | null
}

interface CaseDetailVM {
  assessmentId: string | null
  client: string
  clientEmail: string
  phone: string
  type: string
  claimType: string
  venue: string
  stage: string
  caseValue: number
  policyLimit: number | null
  demand: number | null
  daysOpen: string
  adjuster: string
  evidenceFiles: any[]
}

export default function CaseWorkspacePage() {
  const { leadId, section } = useParams<{ leadId?: string; section?: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  // One-time celebratory banner shown right after an attorney buys/accepts a case
  // (both the routing-fee payment path and the direct-accept path land here with
  // ?accepted=1). Local state so it survives the URL cleanup below and can be dismissed.
  const [showCongrats, setShowCongrats] = useState(searchParams.get('accepted') === '1')
  // Where the user came from, so the back button + tab navigation return there.
  const fromParam = searchParams.get('from')
  const fromSuffix = fromParam ? `?from=${fromParam}` : ''
  const backTarget =
    fromParam === 'calendar'
      ? { to: '/attorney-dashboard/cases/calendar', label: 'Calendar' }
      : { to: '/attorney-dashboard/cases/active', label: 'Active cases' }

  const [lead, setLead] = useState<any | null>(null)
  const [cc, setCc] = useState<CaseCommandCenter | null>(null)
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatDraft, setChatDraft] = useState('')
  // Bumped on every open so the drawer remounts fresh and always seeds its
  // textarea from the draft we just passed (immune to stale internal state).
  const [chatSession, setChatSession] = useState(0)

  // Open the embedded ChatDrawer, optionally pre-filled with a suggested update.
  const openChat = (draft?: string) => {
    setChatDraft(draft || '')
    setChatSession((n) => n + 1)
    setChatOpen(true)
  }

  const tab = SECTION_TO_TAB[(section || 'overview').toLowerCase()] ?? 'Overview'

  // Single source of truth for this case's tasks — shared by the Tasks tab
  // (full CRUD) and the Deadlines tab, so a change in one updates the other.
  const reloadTasks = useCallback(async () => {
    if (!leadId) return
    try {
      const data = await getLeadTasks(leadId)
      setTasks((Array.isArray(data) ? data : []) as TaskRow[])
    } catch {
      /* tasks are best-effort; keep whatever we already have */
    }
  }, [leadId])

  useEffect(() => {
    if (!leadId) return
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    setError(null)
    ;(async () => {
      try {
        const [dash, leadTasks] = await Promise.all([
          getAttorneyDashboard(),
          getLeadTasks(leadId).catch(() => [] as any[]),
        ])
        if (cancelled) return
        const found = ((dash?.recentLeads as any[]) || []).find((l: any) => l.id === leadId) || null
        setLead(found)
        if (!found) {
          setNotFound(true)
          return
        }
        setTasks((Array.isArray(leadTasks) ? leadTasks : []) as TaskRow[])
        // Command center is best-effort — the header/tabs degrade gracefully without it.
        try {
          const center = await getLeadCommandCenter(leadId)
          if (!cancelled) setCc(center)
        } catch {
          /* command center optional */
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.error || err?.message || 'Failed to load case')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [leadId])

  const detail = useMemo<CaseDetailVM | null>(() => {
    if (!lead) return null
    const a = lead.assessment || {}
    const user = a.user || {}
    const preds = a.predictions
    const pred = Array.isArray(preds)
      ? [...preds].sort((x, y) => new Date(x?.createdAt || 0).getTime() - new Date(y?.createdAt || 0).getTime()).pop()
      : preds || {}
    let bands: any = {}
    if (pred?.bands) {
      try {
        bands = typeof pred.bands === 'string' ? JSON.parse(pred.bands) : pred.bands
      } catch {
        bands = {}
      }
    }
    const highBand = Number(bands.high ?? bands.p75 ?? bands.median ?? 0) || 0
    const caseValue = cc?.valueStory?.median || cc?.valueStory?.high || highBand
    const claimType = a.claimType || ''
    return {
      assessmentId: lead.assessmentId || a.id || null,
      client: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Client',
      clientEmail: user.email || '',
      phone: user.phone || '—',
      type: claimLabel(claimType),
      claimType,
      venue: [a.venueCounty, a.venueState].filter(Boolean).join(', ') || '—',
      stage: cc?.stage?.title || STATUS_LABEL[lead.status] || lead.status,
      caseValue,
      policyLimit: cc?.coverageStory?.policyLimit ?? null,
      demand: cc?.negotiationSummary?.latestDemand ?? null,
      daysOpen: daysOpen(lead.submittedAt || a.createdAt),
      adjuster: cc?.coverageStory?.label || 'Not yet assigned',
      evidenceFiles: (a.evidenceFiles || a.files || []) as any[],
    }
  }, [lead, cc])

  // Remember this case as "recently opened" once it resolves, so the Case
  // Workspace launcher can offer quick re-entry (Continue working / Recent).
  useEffect(() => {
    if (leadId && lead) recordRecentCase(leadId)
  }, [leadId, lead])

  // Drop the one-time ?accepted=1 flag from the URL once we've captured it, so a
  // page refresh or shared link doesn't resurface the congratulations banner.
  useEffect(() => {
    if (searchParams.get('accepted') !== '1') return
    const next = new URLSearchParams(searchParams)
    next.delete('accepted')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!leadId) return <EmptyState message="No case selected." />

  return (
    <div className="space-y-4">
      <BackButton to={backTarget.to} label={backTarget.label} />

      {showCongrats && (
        <div className="relative flex items-start gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <PartyPopper className="h-5 w-5" />
          </div>
          <div className="min-w-0 pr-6">
            <p className="text-sm font-semibold text-emerald-900">
              Congratulations — this case is now yours!
            </p>
            <p className="mt-0.5 text-sm text-emerald-800">
              You can now manage everything for this matter right here — client details, documents,
              tasks, deadlines, and messages all live in this workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCongrats(false)}
            className="absolute right-3 top-3 rounded-full p-1 text-emerald-500 transition hover:bg-emerald-100 hover:text-emerald-700"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <EmptyState message="Loading case workspace…" />
      ) : error ? (
        <EmptyState message={error} />
      ) : notFound || !detail ? (
        <EmptyState message="This case isn't in your caseload." />
      ) : (
        <>
          {/* Header card — client, type/venue, stage pill, key metrics + contact row */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  {detail.client} <span className="font-normal text-slate-400">—</span>{' '}
                  <span className="font-semibold text-slate-700">{detail.type}</span>
                  <span className="font-normal text-slate-400"> · {detail.venue}</span>
                </h1>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                  {detail.stage}
                </span>
                <button
                  type="button"
                  onClick={() => openChat()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                >
                  <MessageSquare className="h-4 w-4" />
                  Message client
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metric label="Case value" value={money(detail.caseValue)} accent />
              <Metric label="Policy limit" value={money(detail.policyLimit)} />
              <Metric label="Demand" value={money(detail.demand)} />
              <Metric label="Days open" value={detail.daysOpen} />
            </div>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-100 pt-3 text-sm text-slate-500">
              <span>
                Client: <span className="text-slate-700">{detail.client}</span> · {detail.phone}
              </span>
              <span>
                Adjuster: <span className="text-slate-700">{detail.adjuster}</span>
              </span>
            </div>
          </section>

          {/* Tab strip — wraps onto multiple rows so every tab (icon + full label) stays fully visible */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm">
            {TABS.map((t) => {
              const active = t === tab
              const TabIcon = TAB_META[t].icon
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => navigate(`/attorney-dashboard/cases/${leadId}/${TAB_TO_SECTION[t]}${fromSuffix}`)}
                  title={t}
                  aria-label={t}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                    active
                      ? 'scale-[1.03] bg-gradient-to-b from-brand-500 to-brand-700 font-semibold text-white shadow-md shadow-brand-700/30 ring-1 ring-inset ring-white/15'
                      : 'text-slate-500 hover:bg-brand-100 hover:text-brand-700 hover:shadow-sm hover:ring-1 hover:ring-inset hover:ring-brand-200'
                  }`}
                >
                  <TabIcon className={`h-4 w-4 shrink-0 transition-colors ${active ? 'text-white' : 'text-slate-400 group-hover:text-brand-600'}`} />
                  <span>{t}</span>
                </button>
              )
            })}
          </div>

          {/* Tab body */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                {(() => {
                  const HeaderIcon = TAB_META[tab].icon
                  return <HeaderIcon className="h-5 w-5" />
                })()}
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-900">{tab}</h2>
                <p className="truncate text-xs text-slate-500">{TAB_META[tab].blurb}</p>
              </div>
            </header>
            <div className="p-5 sm:p-6">
              <WorkstreamPanel tab={tab} section={section} lead={lead} detail={detail} cc={cc} tasks={tasks} reloadTasks={reloadTasks} onOpenChat={openChat} />
            </div>
          </section>

          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            The case workspace holds all privileged work product for this retained matter. A declined or expired
            marketplace match never reaches this surface.
          </p>

          <ChatDrawer
            key={chatSession}
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            initialDraft={chatDraft}
            plaintiffName={detail.client}
            phone={detail.phone}
            email={detail.clientEmail}
            caseLabel={detail.type}
            venue={detail.venue}
            leadId={leadId}
            userId={lead?.assessment?.user?.id ?? null}
            assessmentId={detail.assessmentId}
          />
        </>
      )}
    </div>
  )
}

function WorkstreamPanel({
  tab,
  section,
  lead,
  detail,
  cc,
  tasks,
  reloadTasks,
  onOpenChat,
}: {
  tab: Tab
  section?: string
  lead: any
  detail: CaseDetailVM
  cc: CaseCommandCenter | null
  tasks: TaskRow[]
  reloadTasks: () => Promise<void> | void
  onOpenChat: (draft?: string) => void
}) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromSuffix = searchParams.get('from') ? `?from=${searchParams.get('from')}` : ''
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [requestedDocKeys, setRequestedDocKeys] = useState<Set<string>>(new Set())
  const [timelineNewestFirst, setTimelineNewestFirst] = useState(true)

  const goToSection = (s: string) => navigate(`/attorney-dashboard/cases/${lead.id}/${s}${fromSuffix}`)

  // Fire a plaintiff-facing document request for the given labels (best-effort,
  // with inline success/error feedback). `keys` marks which missing-item rows to
  // grey out once requested.
  const requestDocs = async (labels: string[], message: string | undefined, busyId: string, keys: string[]) => {
    if (!labels.length) return
    setActionBusy(busyId)
    setActionMsg(null)
    try {
      await createDocumentRequest(lead.id, { requestedDocs: labels, customMessage: message || undefined })
      setRequestedDocKeys((prev) => new Set([...prev, ...keys]))
      setActionMsg({ tone: 'ok', text: `Requested ${labels.length} document${labels.length === 1 ? '' : 's'} from ${detail.client}.` })
    } catch (err: any) {
      setActionMsg({ tone: 'err', text: err?.response?.data?.error || 'Could not send the document request.' })
    } finally {
      setActionBusy(null)
    }
  }

  // Run the command center's recommended next best action.
  const runNextBestAction = async () => {
    const nba = cc?.nextBestAction
    if (!nba) return
    switch (nba.actionType) {
      case 'schedule_consult':
        navigate(`/attorney-dashboard/schedule-consult/${lead.id}?returnTo=${encodeURIComponent(`/attorney-dashboard/cases/${lead.id}/overview`)}`)
        break
      case 'client_follow_up':
        onOpenChat(cc?.suggestedPlaintiffUpdate || '')
        break
      case 'prepare_demand':
        goToSection('demand')
        break
      case 'review_negotiation':
        goToSection('negotiation')
        break
      case 'request_documents': {
        const sug = cc?.suggestedDocumentRequest
        const labels = sug?.requestedDocs?.length
          ? sug.requestedDocs
          : (cc?.missingItems || []).map((m) => m.label)
        if (labels.length) await requestDocs(labels, sug?.customMessage, 'nba', (cc?.missingItems || []).map((m) => m.key))
        else goToSection('evidence')
        break
      }
      default:
        goToSection('overview')
    }
  }
  if (tab === 'Evidence') {
    return (
      <EvidencePanel
        leadId={lead.id}
        assessmentId={detail.assessmentId}
        clientName={detail.client}
        initialFiles={detail.evidenceFiles}
      />
    )
  }

  if (tab === 'Signatures') {
    return (
      <SignatureRequestPanel
        leadId={lead.id}
        defaultSignerName={detail.client}
        defaultSignerEmail={detail.clientEmail}
        // Arriving via "Send retainer" (section=documents) preselects the retainer agreement.
        initialDocumentType={(section || '').toLowerCase() === 'documents' ? 'retainer' : 'hipaa_authorization'}
      />
    )
  }

  if (tab === 'Medical') {
    return <MedicalPanel leadId={lead.id} cc={cc} onOpenSection={goToSection} />
  }

  if (tab === 'Insurance') {
    return <InsurancePanel leadId={lead.id} claimType={detail.claimType} />
  }

  if (tab === 'Negotiation') {
    const n = cc?.negotiationSummary
    const median = cc?.valueStory?.median || detail.caseValue || 0
    const high = cc?.valueStory?.high || 0
    const policy = detail.policyLimit || 0

    // Empty state — negotiation hasn't opened until a demand is on file.
    if (!n || n.eventCount === 0) {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
              <Handshake className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">Negotiation hasn’t opened yet</h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">
              Offers and counters will track here once the demand package is sent to the carrier. Prepare and send the
              demand to start the negotiation clock.
            </p>
            <button
              type="button"
              onClick={() => goToSection('demand')}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              <Send className="h-4 w-4" /> Prepare demand
            </button>
            {median > 0 || policy > 0 ? (
              <div className="mt-7 border-t border-slate-100 pt-5">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Negotiation targets</p>
                <div className="grid grid-cols-2 gap-3 text-left sm:grid-cols-3">
                  <Metric label="Case value (median)" value={money(median)} />
                  {high > 0 ? <Metric label="Upside (high)" value={money(high)} /> : null}
                  <Metric label="Policy limit" value={money(policy)} accent />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )
    }

    const demand = n.latestDemand ?? 0
    const offer = n.latestOffer ?? 0
    const gapClosedPct = demand > 0 && offer > 0 ? Math.round((offer / demand) * 100) : null
    const scaleMax = Math.max(demand, offer, policy, median) || 1
    const asPct = (v: number) => Math.max(0, Math.min(100, (v / scaleMax) * 100))

    const rows: string[][] = []
    const tone: Tone[] = []
    if (n.latestDemand != null) {
      rows.push([formatDate(n.latestEventDate), 'Us', 'Demand', money(n.latestDemand)])
      tone.push('info')
    }
    if (n.latestOffer != null) {
      rows.push([formatDate(n.latestEventDate), 'Carrier', n.latestStatus || 'Offer', money(n.latestOffer)])
      tone.push('warning')
    }

    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-brand-600 shadow-sm">
              <Handshake className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">Settlement posture</p>
              <p className="mt-0.5 text-sm font-medium text-slate-800">{n.posture || '—'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Latest offer" value={money(offer)} />
          <Metric label="Latest demand" value={money(demand)} />
          <Metric label="Gap to demand" value={money(n.gapToDemand)} />
          <Metric label="Policy limit" value={money(policy)} accent />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Negotiation ladder</h3>
            {gapClosedPct != null ? (
              <span className="text-xs font-medium text-slate-500">Offer is {gapClosedPct}% of demand</span>
            ) : null}
          </div>
          <div className="relative mx-1 mb-8 mt-9 h-3 rounded-full bg-slate-100">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
              style={{ width: `${asPct(offer)}%` }}
            />
            {offer > 0 ? <LadderMarker pct={asPct(offer)} label="Offer" value={money(offer)} color="amber" align="bottom" /> : null}
            {demand > 0 ? <LadderMarker pct={asPct(demand)} label="Demand" value={money(demand)} color="brand" align="top" /> : null}
            {policy > 0 ? <LadderMarker pct={asPct(policy)} label="Policy" value={money(policy)} color="emerald" align="top" /> : null}
          </div>
        </div>

        {rows.length ? (
          <DataTable headers={['Date', 'Party', 'Position', 'Amount']} align={['left', 'left', 'left', 'right']} rows={rows} tone={tone} />
        ) : null}

        {n.recommendedMove ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm leading-relaxed text-slate-700">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
            <div>
              <span className="font-semibold text-slate-900">Recommended move · </span>
              {n.recommendedMove}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  if (tab === 'Demand') {
    const n = cc?.negotiationSummary
    const v = cc?.valueStory
    const bm = cc?.medicalCostBenchmark
    const policy = detail.policyLimit || 0
    const median = v?.median || detail.caseValue || 0
    const low = v?.low || 0
    const high = v?.high || 0
    const readinessScore = Number(cc?.readiness?.score ?? 0)
    const blockers = cc?.missingItems || []
    const latestDemand = n?.latestDemand ?? 0
    const medSpecials = bm?.medCharges ?? bm?.benchmarkTypicalTotal ?? 0

    if (!v && latestDemand === 0 && median === 0) {
      return <Note>Demand not started. A demand package is prepared once treatment stabilizes and evidence is complete.</Note>
    }

    // Suggested opening demand: anchor above the modeled high to leave negotiating
    // room, rounded to a clean figure the attorney can defend.
    const anchor = Math.max(high, median * 1.4)
    const roundTo = anchor >= 100_000 ? 25_000 : anchor >= 25_000 ? 5_000 : 1_000
    const suggestedDemand = anchor > 0 ? Math.ceil(anchor / roundTo) * roundTo : 0
    const demandReady = readinessScore >= 70

    const rangeMax = Math.max(high, policy, median, latestDemand) || 1
    const rPct = (x: number) => Math.max(0, Math.min(100, (x / rangeMax) * 100))

    return (
      <div className="space-y-4">
        <div className={`flex items-start gap-3 rounded-2xl border p-4 ${demandReady ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white shadow-sm ${demandReady ? 'text-emerald-600' : 'text-amber-600'}`}>
            {demandReady ? <Check className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${demandReady ? 'text-emerald-800' : 'text-amber-800'}`}>
              {demandReady ? 'Case is demand-ready' : 'Not demand-ready yet'}
            </p>
            <p className="mt-0.5 text-sm text-slate-600">
              {demandReady
                ? 'Readiness clears the bar — assemble specials, liability, and the damages narrative into the package.'
                : `Readiness is ${readinessScore}%. Close the ${blockers.length} item${blockers.length === 1 ? '' : 's'} below to strengthen the file before sending.`}
            </p>
          </div>
        </div>

        {cc?.readiness ? (
          <MeterCard
            label="Demand readiness"
            percent={readinessScore}
            caption={cc.readiness.label}
            barClass={readinessBar(readinessScore)}
            breakdown={cc.readiness.factors}
          />
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Valuation &amp; demand anchor</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Medical specials" value={money(medSpecials)} />
            <Metric label="Case value (median)" value={money(median)} />
            <Metric label="Suggested opening demand" value={money(suggestedDemand)} accent />
            <Metric label="Policy limit" value={money(policy)} />
          </div>

          {high > 0 ? (
            <div className="relative mx-1 mb-9 mt-10 h-3 rounded-full bg-slate-100">
              <div
                className="absolute inset-y-0 rounded-full bg-brand-200"
                style={{ left: `${rPct(low)}%`, width: `${Math.max(2, rPct(high) - rPct(low))}%` }}
              />
              {low > 0 ? <LadderMarker pct={rPct(low)} label="Low" value={money(low)} color="brand" align="bottom" /> : null}
              {median > 0 ? <LadderMarker pct={rPct(median)} label="Median" value={money(median)} color="brand" align="top" /> : null}
              {high > 0 ? <LadderMarker pct={rPct(high)} label="High" value={money(high)} color="brand" align="bottom" /> : null}
              {policy > 0 ? <LadderMarker pct={rPct(policy)} label="Policy" value={money(policy)} color="emerald" align="top" /> : null}
              {latestDemand > 0 ? <LadderMarker pct={rPct(latestDemand)} label="Demanded" value={money(latestDemand)} color="amber" align="top" /> : null}
            </div>
          ) : null}

          {policy > 0 && high > policy ? (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Modeled value runs above the known policy limit — build the demand with a policy-limits strategy and document the excess exposure.</span>
            </div>
          ) : null}
          {v?.detail ? <p className="mt-3 text-sm leading-relaxed text-slate-500">{v.detail}</p> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <StoryCard title="Liability" label={cc?.liabilityStory?.label} detail={cc?.liabilityStory?.detail} />
          <StoryCard title="Coverage" label={cc?.coverageStory?.label} detail={cc?.coverageStory?.detail} />
        </div>

        {actionMsg ? (
          <div className={`rounded-lg px-3 py-2 text-sm ${actionMsg.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {actionMsg.text}
          </div>
        ) : null}

        {blockers.length ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Close before sending demand</h4>
              <button
                type="button"
                onClick={() => requestDocs(blockers.map((b) => b.label), cc?.suggestedDocumentRequest?.customMessage, 'all', blockers.map((b) => b.key))}
                disabled={actionBusy != null || blockers.every((b) => requestedDocKeys.has(b.key))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {actionBusy === 'all' ? 'Requesting…' : 'Request all'}
              </button>
            </div>
            <ul className="mt-2.5 space-y-1.5">
              {blockers.map((m) => {
                const done = requestedDocKeys.has(m.key)
                const busy = actionBusy === `doc-${m.key}`
                return (
                  <li key={m.key} className="flex items-center gap-2.5 text-sm">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        done ? 'border-emerald-400 bg-emerald-50 text-emerald-600' : 'border-slate-300 bg-slate-50'
                      }`}
                      aria-hidden
                    >
                      {done ? '✓' : ''}
                    </span>
                    <span className={`flex-1 truncate ${done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{m.label}</span>
                    <PriorityBadge priority={m.priority} />
                    <button
                      type="button"
                      onClick={() => requestDocs([m.label], cc?.suggestedDocumentRequest?.customMessage, `doc-${m.key}`, [m.key])}
                      disabled={done || actionBusy != null}
                      className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent"
                    >
                      {done ? 'Requested' : busy ? 'Requesting…' : 'Request'}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800">
            <Check className="h-4 w-4 shrink-0" />
            All key records are in — no outstanding items blocking the demand.
          </div>
        )}

        {cc?.nextBestAction ? (
          <Note>
            <span className="font-medium text-slate-700">Next: </span>
            {cc.nextBestAction.title}
            {cc.nextBestAction.detail ? ` — ${cc.nextBestAction.detail}` : ''}
          </Note>
        ) : null}
      </div>
    )
  }

  if (tab === 'Timeline') {
    const a = lead?.assessment || {}
    const events: TimelineEvent[] = []
    const openedAt = lead?.submittedAt || a?.createdAt || null
    if (openedAt) events.push({ date: openedAt, title: 'Case submitted', detail: 'Intake completed and matter opened.', by: 'Client', category: 'intake' })
    if (lead?.status === 'retained' && lead?.retainedAt)
      events.push({ date: lead.retainedAt, title: 'Representation active', detail: 'Retainer executed — matter retained.', by: 'Attorney', category: 'retainer' })
    if (lead?.lastContactAt) events.push({ date: lead.lastContactAt, title: 'Client contact made', by: 'Attorney', category: 'contact' })
    const treatedAt = cc?.treatmentMonitor?.latestTreatmentDate
    if (treatedAt) {
      const tm = cc!.treatmentMonitor
      const bits = [tm.providerCount ? `${tm.providerCount} provider${tm.providerCount === 1 ? '' : 's'}` : '', tm.chronologyCount ? `${tm.chronologyCount} visit${tm.chronologyCount === 1 ? '' : 's'}` : ''].filter(Boolean)
      events.push({ date: treatedAt, title: 'Latest treatment recorded', detail: bits.join(' · ') || undefined, by: 'Provider', category: 'treatment' })
    }
    const negotiatedAt = cc?.negotiationSummary?.latestEventDate
    if (negotiatedAt) {
      const ns = cc!.negotiationSummary
      const isDemand = ns.latestEventType === 'demand'
      events.push({
        date: negotiatedAt,
        title: isDemand ? `Demand sent · ${money(ns.latestDemand)}` : `Negotiation · ${ns.latestStatus || ns.latestEventType || 'update'}`,
        detail: !isDemand && ns.latestOffer != null ? `Carrier offer ${money(ns.latestOffer)}` : undefined,
        by: 'Carrier',
        category: isDemand ? 'demand' : 'negotiation',
      })
    }
    ;(a.evidenceFiles || []).forEach((f: any) => {
      if (f.createdAt) events.push({ date: f.createdAt, title: `Uploaded ${f.filename || 'document'}`, detail: f.category ? claimLabel(f.category) : undefined, by: 'Case team', category: 'evidence' })
    })
    if (!events.length) return <Note>No timeline events yet. Activity appears here as the case progresses.</Note>

    const times = events.map((e) => new Date(e.date).getTime()).filter((t) => !Number.isNaN(t))
    const firstAt = times.length ? new Date(Math.min(...times)) : null
    const lastAt = times.length ? new Date(Math.max(...times)) : null
    const sorted = [...events].sort((x, y) => {
      const dx = new Date(x.date).getTime()
      const dy = new Date(y.date).getTime()
      return timelineNewestFirst ? dy - dx : dx - dy
    })
    const usedCategories = Array.from(new Set(sorted.map((e) => e.category)))
    const monthKey = (d: string) => {
      const dt = new Date(d)
      return Number.isNaN(dt.getTime()) ? '' : `${dt.getFullYear()}-${dt.getMonth()}`
    }
    const monthLabel = (d: string) => {
      const dt = new Date(d)
      return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    }

    return (
      <div className="space-y-4">
        {/* Stat header + legend */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm">
          <div className="flex flex-wrap items-stretch justify-between gap-4 p-4">
            <div className="grid flex-1 grid-cols-3 gap-3">
              <TimelineStat icon={FileText} label="Opened" value={formatDate(firstAt?.toISOString())} sub={relativeTime(firstAt?.toISOString())} />
              <TimelineStat icon={Activity} label="Events" value={String(events.length)} sub={`${usedCategories.length} categories`} />
              <TimelineStat icon={Clock} label="Last activity" value={formatDate(lastAt?.toISOString())} sub={relativeTime(lastAt?.toISOString())} />
            </div>
            <button
              type="button"
              onClick={() => setTimelineNewestFirst((prev) => !prev)}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              {timelineNewestFirst ? 'Newest first' : 'Oldest first'}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${timelineNewestFirst ? '' : 'rotate-180'}`} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 bg-white/60 px-4 py-2.5">
            {usedCategories.map((c) => {
              const cat = TIMELINE_CATEGORY[c]
              const CIcon = cat.Icon
              return (
                <span key={c} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <span className={`grid h-4 w-4 place-items-center rounded-full ${cat.wrap}`}>
                    <CIcon className="h-2.5 w-2.5" />
                  </span>
                  {cat.label}
                </span>
              )
            })}
          </div>
        </div>

        {/* Rail */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="relative">
            <span className="absolute bottom-2 left-4 top-2 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" aria-hidden />
            <ul className="space-y-3">
              {sorted.map((e, i) => {
                const cat = TIMELINE_CATEGORY[e.category] || TIMELINE_CATEGORY.evidence
                const CatIcon = cat.Icon
                const showMonth = i === 0 || monthKey(sorted[i - 1].date) !== monthKey(e.date)
                return (
                  <Fragment key={`${e.category}-${e.date}-${i}`}>
                    {showMonth ? (
                      <li className="relative flex items-center gap-3 pt-1">
                        <span className="z-10 ml-[10px] h-3 w-3 rounded-full bg-slate-300 ring-4 ring-white" aria-hidden />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{monthLabel(e.date)}</span>
                      </li>
                    ) : null}
                    <li className="relative flex items-stretch gap-3">
                      <span className={`z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ring-4 ring-white ${cat.wrap} shadow-sm`}>
                        <CatIcon className="h-4 w-4" />
                      </span>
                      <div className={`group flex-1 rounded-xl border border-l-4 border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md ${cat.accent}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cat.chip}`}>{cat.label}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">{relativeTime(e.date)}</span>
                        </div>
                        <p className="mt-1.5 text-sm font-semibold text-slate-900">{e.title}</p>
                        {e.detail ? <p className="mt-0.5 text-sm text-slate-500">{e.detail}</p> : null}
                        <p className="mt-1.5 text-xs text-slate-400">
                          {formatDate(e.date)} · {e.by}
                        </p>
                      </div>
                    </li>
                  </Fragment>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    )
  }

  if (tab === 'Deadlines') {
    const startToday = new Date()
    startToday.setHours(0, 0, 0, 0)
    const dayMs = 86_400_000
    const diffDays = (ts: number) => Math.round((new Date(ts).setHours(0, 0, 0, 0) - startToday.getTime()) / dayMs)

    const openTasks = tasks.filter((t) => String(t.status || '').toLowerCase() !== 'done')
    const dated = openTasks
      .filter((t) => t.dueDate)
      .map((t) => ({ t, ts: Date.parse(t.dueDate as string) }))
      .filter((x) => !Number.isNaN(x.ts))
      .sort((a, b) => a.ts - b.ts)
    const undated = openTasks.filter((t) => !t.dueDate)
    const overdue = dated.filter((x) => diffDays(x.ts) < 0)
    const soon = dated.filter((x) => diffDays(x.ts) >= 0 && diffDays(x.ts) <= 7)
    const later = dated.filter((x) => diffDays(x.ts) > 7)
    const solText = SOL_GUIDANCE[detail.claimType] || SOL_GUIDANCE._default

    const countdown = (ts: number) => {
      const d = diffDays(ts)
      if (d < 0) return { label: `${Math.abs(d)}d overdue`, cls: 'bg-rose-50 text-rose-700 ring-rose-200' }
      if (d === 0) return { label: 'Due today', cls: 'bg-amber-50 text-amber-700 ring-amber-200' }
      if (d <= 7) return { label: `in ${d}d`, cls: 'bg-amber-50 text-amber-700 ring-amber-200' }
      return { label: `in ${d}d`, cls: 'bg-slate-100 text-slate-600 ring-slate-200' }
    }

    const renderItem = (x: { t: TaskRow; ts: number }) => {
      const c = countdown(x.ts)
      return (
        <li key={x.t.id} className="flex items-center gap-3 px-4 py-3">
          <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${c.cls}`}>{c.label}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{x.t.title}</p>
            <p className="text-xs text-slate-400">
              {formatDate(x.t.dueDate)} · {x.t.status || 'Open'}
            </p>
          </div>
          {x.t.priority ? <PriorityBadge priority={String(x.t.priority).toLowerCase()} /> : null}
        </li>
      )
    }

    const group = (title: string, items: Array<{ t: TaskRow; ts: number }>, accent: string) =>
      items.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <h4 className={`text-xs font-semibold uppercase tracking-wide ${accent}`}>{title}</h4>
            <span className="text-xs text-slate-400">{items.length}</span>
          </div>
          <ul className="divide-y divide-slate-100">{items.map(renderItem)}</ul>
        </div>
      ) : null

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Metric label="Overdue" value={overdue.length} />
          <Metric label="Due this week" value={soon.length} />
          <Metric label="Scheduled" value={dated.length} />
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <Gavel className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Statute of limitations — {detail.type}</p>
            <p className="mt-0.5 text-sm text-slate-600">{solText}</p>
            <p className="mt-1 text-xs text-slate-400">Estimate only — confirm the exact filing deadline against the incident date and venue ({detail.venue}).</p>
          </div>
        </div>

        {group('Overdue', overdue, 'text-rose-700')}
        {group('Due this week', soon, 'text-amber-700')}
        {group('Upcoming', later, 'text-slate-500')}

        {!dated.length ? <Note>No scheduled task deadlines yet — the statute guidance above still applies. Add case tasks with due dates and they’ll appear here, sorted by urgency.</Note> : null}

        {cc?.nextBestAction ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm text-slate-700">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
            <div>
              <span className="font-semibold text-slate-900">Recommended next step · </span>
              {cc.nextBestAction.title}
              {cc.nextBestAction.detail ? ` — ${cc.nextBestAction.detail}` : ''}
            </div>
          </div>
        ) : null}

        {undated.length ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Unscheduled tasks</h4>
            <ul className="mt-2 space-y-1.5">
              {undated.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                  <span className="flex-1 truncate">{t.title}</span>
                  {t.priority ? <PriorityBadge priority={String(t.priority).toLowerCase()} /> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    )
  }

  if (tab === 'Settlement') {
    return <SettlementPanel leadId={lead.id} />
  }

  if (tab === 'Tasks') {
    return <TasksPanel leadId={lead.id} tasks={tasks} reload={reloadTasks} />
  }

  // Overview — a case-at-a-glance summary built from the command center (cc).
  {
    const v = cc?.valueStory
    const n = cc?.negotiationSummary
    const readinessScore = Number(cc?.readiness?.score ?? 0)
    const estValue =
      v && (v.low || v.high)
        ? v.low && v.high
          ? `${compactMoney(v.low)}–${compactMoney(v.high)}`
          : money(v.median || v.high || v.low)
        : money(detail.caseValue)
    const hasPosture = Boolean(cc && (cc.strengths?.length || cc.weaknesses?.length || cc.defenseRisks?.length))
    const nba = cc?.nextBestAction
    const nbaMeta = nba ? NBA_META[nba.actionType] : null
    const NbaIcon = nbaMeta?.Icon || Send
    const missing = cc?.missingItems || []
    const requestAllLabels = cc?.suggestedDocumentRequest?.requestedDocs?.length
      ? cc.suggestedDocumentRequest.requestedDocs
      : missing.map((m) => m.label)

    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          {cc?.stage?.detail || cc?.readiness?.detail || 'Retained case in progress. Work the tabs above to advance the file.'}
        </p>

        {nba ? (
          <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">Recommended next step</p>
                <p className="mt-1 font-semibold text-slate-900">{nba.title}</p>
                {nba.detail ? <p className="mt-0.5 text-sm text-slate-600">{nba.detail}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={runNextBestAction}
                  disabled={actionBusy === 'nba'}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
                >
                  <NbaIcon className="h-4 w-4" />
                  {actionBusy === 'nba' ? 'Working…' : nbaMeta?.label || 'Take action'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {actionMsg ? (
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              actionMsg.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            {actionMsg.text}
          </div>
        ) : null}

        {cc ? (
          <>
            <CaseProgressTracker cc={cc} lead={lead} onNavigate={goToSection} />
            <MeterCard
              label="Demand readiness"
              percent={readinessScore}
              caption={cc.readiness?.label}
              barClass={readinessBar(readinessScore)}
              breakdown={cc.readiness?.factors}
            />
          </>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Est. value" value={estValue} accent />
          <Metric label="Policy limit" value={money(detail.policyLimit)} />
          <Metric label="Latest demand" value={money(n?.latestDemand)} />
          <Metric label="Days open" value={detail.daysOpen} />
        </div>

        {n && n.latestOffer != null ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Metric label="Latest offer" value={money(n.latestOffer)} />
            {n.gapToDemand != null ? <Metric label="Gap to demand" value={money(n.gapToDemand)} /> : null}
            <Metric label="Adjuster" value={detail.adjuster} />
          </div>
        ) : null}

        {hasPosture ? (
          <div className="grid gap-3 lg:grid-cols-3">
            <PostureCard title="Strengths" accent="emerald" items={cc?.strengths} empty="No standout strengths logged yet." />
            <PostureCard title="Weaknesses" accent="amber" items={cc?.weaknesses} empty="No weaknesses flagged yet." />
            <PostureCard title="Defense risks" accent="rose" items={cc?.defenseRisks} empty="No defense risks flagged yet." />
          </div>
        ) : null}

        {missing.length ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Missing to strengthen the file</h4>
              <button
                type="button"
                onClick={() => requestDocs(requestAllLabels, cc?.suggestedDocumentRequest?.customMessage, 'all', missing.map((m) => m.key))}
                disabled={actionBusy != null || missing.every((m) => requestedDocKeys.has(m.key))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {actionBusy === 'all' ? 'Requesting…' : 'Request all'}
              </button>
            </div>
            <ul className="mt-2.5 space-y-1.5">
              {missing.map((m) => {
                const done = requestedDocKeys.has(m.key)
                const busy = actionBusy === `doc-${m.key}`
                return (
                  <li key={m.key} className="flex items-center gap-2.5 text-sm">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        done ? 'border-emerald-400 bg-emerald-50 text-emerald-600' : 'border-slate-300 bg-slate-50'
                      }`}
                      aria-hidden
                    >
                      {done ? '✓' : ''}
                    </span>
                    <span className={`flex-1 truncate ${done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{m.label}</span>
                    <PriorityBadge priority={m.priority} />
                    <button
                      type="button"
                      onClick={() => requestDocs([m.label], cc?.suggestedDocumentRequest?.customMessage, `doc-${m.key}`, [m.key])}
                      disabled={done || actionBusy != null}
                      className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent"
                    >
                      {done ? 'Requested' : busy ? 'Requesting…' : 'Request'}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </div>
    )
  }
}

const UPLOAD_CATEGORIES = [
  { id: 'medical_records', label: 'Medical records' },
  { id: 'police_report', label: 'Police report' },
  { id: 'bills', label: 'Bills' },
  { id: 'photos', label: 'Photos' },
  { id: 'wage_loss', label: 'Wage loss' },
  { id: 'insurance', label: 'Insurance / dec page' },
  { id: 'correspondence', label: 'Correspondence' },
  { id: 'other', label: 'Other' },
]

// Upload guardrails enforced client-side before we hit the API.
const MAX_UPLOAD_MB = 25
const ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt']

function fileExt(name: string) {
  const parts = (name || '').split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
}

// Best-effort audit "source" for an evidence file, derived from the upload method
// and provenance metadata (attorney uploads use the file picker; client portal
// uploads come through drag/drop or camera).
function evidenceSource(doc: any): { label: string; tone: Tone } {
  const method = String(doc.uploadMethod || '').toLowerCase()
  const prov = String(doc.provenanceSource || doc.provenanceActor || '').toLowerCase()
  if (method === 'file_picker' || prov.includes('attorney') || prov.includes('firm') || prov.includes('paralegal')) {
    return { label: 'By attorney', tone: 'info' }
  }
  if (method === 'camera') return { label: 'Client photo', tone: 'neutral' }
  if (method === 'drag_drop' || prov.includes('client') || prov.includes('plaintiff') || prov.includes('portal')) {
    return { label: 'Client upload', tone: 'neutral' }
  }
  return { label: 'Uploaded', tone: 'neutral' }
}

function parseHighlights(raw: any): string[] {
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (Array.isArray(parsed)) {
      return parsed
        .map((h) => (typeof h === 'string' ? h : h?.text || h?.snippet || ''))
        .filter(Boolean)
    }
  } catch {
    if (typeof raw === 'string' && raw.trim()) return [raw.trim()]
  }
  return []
}

const REQUESTABLE_DOCS = [
  'Medical records',
  'Medical bills',
  'Police / incident report',
  'Photos of injuries',
  'Photos of property damage',
  'Insurance information',
  'Wage-loss documentation',
  'Prior treatment records',
]

// The core documents a well-prepared PI file is expected to carry. Drives the
// evidence-coverage strip: present categories show a check, missing ones offer a
// one-click "request from client". `req` maps to a REQUESTABLE_DOCS label.
const COVERAGE_CHECKLIST = [
  { id: 'medical_records', label: 'Medical records', req: 'Medical records' },
  { id: 'bills', label: 'Bills', req: 'Medical bills' },
  { id: 'police_report', label: 'Police report', req: 'Police / incident report' },
  { id: 'photos', label: 'Photos', req: 'Photos of injuries' },
]

const STATUS_BADGE: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-600',
  info: 'bg-brand-50 text-brand-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-rose-50 text-rose-700',
}

function formatSize(bytes?: number) {
  if (!bytes) return ''
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

type MedicalTimelineEvent = {
  id: string
  date: string | null
  label: string
  source: 'incident' | 'treatment' | 'evidence' | 'medical_record' | string
  details?: string
  provider?: string
  amount?: number
  sourceFileId?: string
  sourceFileName?: string
  extractionConfidence?: 'documented' | 'estimated' | 'needs_review'
}

const CONFIDENCE_BADGE: Record<string, { label: string; cls: string }> = {
  documented: { label: 'Documented', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  estimated: { label: 'Estimated', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  needs_review: { label: 'Needs review', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
}

const TIMELINE_SOURCE_ICON: Record<string, ComponentType<{ className?: string }>> = {
  incident: AlertTriangle,
  treatment: Stethoscope,
  medical_record: FileText,
  evidence: FolderOpen,
}

function gapTone(gapDays: number): { cls: string; label: string } {
  if (gapDays >= 90) return { cls: 'border-rose-200 bg-rose-50 text-rose-700', label: 'High causation risk' }
  if (gapDays >= 45) return { cls: 'border-amber-200 bg-amber-50 text-amber-700', label: 'Moderate risk' }
  return { cls: 'border-slate-200 bg-slate-50 text-slate-600', label: 'Minor gap' }
}

function daysBetween(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null
  const t1 = Date.parse(a)
  const t2 = Date.parse(b)
  if (Number.isNaN(t1) || Number.isNaN(t2)) return null
  return Math.max(0, Math.round(Math.abs(t2 - t1) / 86400000))
}

/** Section header with an icon, used across the medical workspace. */
function MedSection({ icon: Icon, title, count }: { icon: ComponentType<{ className?: string }>; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-brand-600" />
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      {typeof count === 'number' ? (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{count}</span>
      ) : null}
    </div>
  )
}

/** Chip row for coded clinical data (diagnoses, procedures, meds, imaging, surgeries). */
function ChipGroup({
  icon,
  title,
  items,
  tone = 'slate',
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  items: string[]
  tone?: 'slate' | 'brand' | 'violet' | 'sky'
}) {
  if (!items.length) return null
  const toneCls: Record<string, string> = {
    slate: 'bg-slate-50 text-slate-700 ring-slate-200',
    brand: 'bg-brand-50 text-brand-700 ring-brand-200',
    violet: 'bg-violet-50 text-violet-700 ring-violet-200',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <MedSection icon={icon} title={title} count={items.length} />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <span
            key={`${it}-${i}`}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${toneCls[tone]}`}
          >
            {it}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Rich clinical workspace for a retained matter. Pulls the full medical
 * chronology summary (diagnoses, procedures, imaging, surgeries, medications,
 * billed total, treatment gaps, and a documented timeline with source files) so
 * the attorney can build the damages story without leaving the case file.
 */
function MedicalPanel({
  leadId,
  cc,
  onOpenSection,
}: {
  leadId: string
  cc: CaseCommandCenter | null
  onOpenSection: (section: string) => void
}) {
  const [summary, setSummary] = useState<MedicalChronologySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    getLeadMedicalChronologySummary(leadId)
      .then((s) => setSummary(s))
      .catch(() => setError('Could not load the medical chronology.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getLeadMedicalChronologySummary(leadId)
      .then((s) => {
        if (!cancelled) setSummary(s)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the medical chronology.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [leadId])

  const tm = cc?.treatmentMonitor
  const bench = cc?.medicalCostBenchmark

  const providerCount = summary?.providers.length ?? tm?.providerCount ?? 0
  const eventCount = summary?.eventCount ?? tm?.chronologyCount ?? 0
  const providers = summary?.providers?.length ? summary.providers : tm?.providers ?? []
  const billed = summary?.billedTotal ?? 0
  const firstDate = summary?.firstTreatmentDate ?? null
  const lastDate = summary?.lastTreatmentDate ?? null
  const spanDays = daysBetween(firstDate, lastDate)
  const gaps = summary?.treatmentGaps ?? []
  const largestGap = gaps.reduce((m, g) => Math.max(m, g.gapDays || 0), tm?.largestGapDays ?? 0)
  const timeline = (summary?.timeline ?? []) as MedicalTimelineEvent[]

  const hasAnything = eventCount > 0 || providerCount > 0 || (summary && summary.eventCount > 0)

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <RefreshCw className="h-4 w-4 animate-spin" /> Loading medical chronology…
      </div>
    )
  }

  if (!hasAnything) {
    return (
      <div className="space-y-3">
        {error ? (
          <Note>
            {error}{' '}
            <button onClick={load} className="font-medium text-brand-600 hover:text-brand-700">
              Retry
            </button>
          </Note>
        ) : (
          <Note>
            {tm?.recommendedAction ||
              'No medical records processed yet. As treatment records and bills are uploaded, providers, diagnoses, costs, and a treatment timeline will appear here.'}
          </Note>
        )}
        <button
          onClick={() => onOpenSection('evidence')}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Upload className="h-4 w-4" /> Add medical records
        </button>
      </div>
    )
  }

  const statusTone =
    largestGap >= 90 ? 'danger' : largestGap >= 45 ? 'warning' : eventCount >= 4 ? 'success' : 'info'
  const statusToneCls: Record<string, string> = {
    danger: 'border-rose-200 bg-rose-50 text-rose-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-brand-100 bg-brand-50/60 text-brand-800',
  }

  return (
    <div className="space-y-5">
      {/* Snapshot */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label="Providers" value={String(providerCount)} />
        <Metric label="Treatment events" value={String(eventCount)} />
        <Metric label="Billed to date" value={billed > 0 ? money(billed) : '—'} accent={billed > 0} />
        <Metric
          label="Treatment span"
          value={
            firstDate && lastDate ? (
              <span className="text-sm">
                {formatDate(firstDate)} – {formatDate(lastDate)}
                {spanDays != null ? <span className="ml-1 text-xs font-normal text-slate-400">({spanDays}d)</span> : null}
              </span>
            ) : (
              '—'
            )
          }
        />
        <Metric
          label="Largest gap"
          value={largestGap > 0 ? `${largestGap}d` : 'None'}
          accent={false}
        />
      </div>

      {/* Status banner */}
      {tm?.status ? (
        <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${statusToneCls[statusTone]}`}>
          <Activity className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">{tm.status}</p>
            {tm.recommendedAction ? <p className="mt-0.5 opacity-90">{tm.recommendedAction}</p> : null}
          </div>
        </div>
      ) : null}

      {/* Treatment gaps */}
      {gaps.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <MedSection icon={AlertTriangle} title="Treatment gaps" count={gaps.length} />
          <p className="mt-1 text-xs text-slate-500">
            Unexplained gaps let the defense argue you recovered or the injury was unrelated. Document the reason for each.
          </p>
          <div className="mt-3 space-y-2">
            {gaps
              .slice()
              .sort((a, b) => (b.gapDays || 0) - (a.gapDays || 0))
              .map((g, i) => {
                const t = gapTone(g.gapDays)
                return (
                  <div key={i} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${t.cls}`}>
                    <span className="font-medium">
                      {formatDate(g.startDate)} → {formatDate(g.endDate)}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-bold tabular-nums">{g.gapDays} days</span>
                      <span className="rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-semibold">{t.label}</span>
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      ) : null}

      {/* Clinical picture */}
      {summary ? (
        <div className="grid gap-3 md:grid-cols-2">
          <ChipGroup
            icon={Activity}
            title="Diagnoses (ICD-10)"
            items={summary.diagnoses.map((d) => (d.code ? `${d.label} · ${d.code}` : d.label)).filter(Boolean)}
            tone="brand"
          />
          <ChipGroup
            icon={ListChecks}
            title="Procedures (CPT)"
            items={summary.procedures.map((p) => (p.code ? `${p.label} · ${p.code}` : p.label)).filter(Boolean)}
            tone="sky"
          />
          <ChipGroup icon={Scissors} title="Surgeries" items={summary.surgeries} tone="violet" />
          <ChipGroup icon={ScanLine} title="Imaging" items={summary.imaging} tone="slate" />
          <ChipGroup icon={Pill} title="Medications" items={summary.medications} tone="slate" />
        </div>
      ) : null}

      {/* Cost benchmark */}
      {bench && bench.status === 'available' && bench.matchedCategories.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <MedSection icon={Receipt} title="Cost benchmarks" />
          <p className="mt-1 mb-3 text-xs text-slate-500">
            Typical vs. high paid amounts per patient for the treatment on file — anchors your damages ask.
          </p>
          <DataTable
            headers={['Treatment category', 'Typical / patient', 'High / patient']}
            align={['left', 'right', 'right']}
            rows={bench.matchedCategories.map((c) => [
              c.categoryLabel,
              money(c.medianPaidPerPatient),
              money(c.p90PaidPerPatient),
            ])}
          />
        </div>
      ) : null}

      {/* Treatment timeline */}
      {timeline.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <MedSection icon={Clock} title="Treatment timeline" count={timeline.length} />
          <ol className="mt-3 space-y-0">
            {timeline.map((ev, i) => {
              const Icon = TIMELINE_SOURCE_ICON[ev.source] || Stethoscope
              const conf = ev.extractionConfidence ? CONFIDENCE_BADGE[ev.extractionConfidence] : null
              const isLast = i === timeline.length - 1
              return (
                <li key={ev.id || i} className="relative flex gap-3 pb-4">
                  {!isLast ? <span className="absolute left-[15px] top-8 h-full w-px bg-slate-200" /> : null}
                  <span className="z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{ev.label}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatDate(ev.date)}
                          {ev.provider ? <> · {ev.provider}</> : null}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {ev.amount ? <span className="text-sm font-semibold tabular-nums text-slate-800">{money(ev.amount)}</span> : null}
                        {conf ? (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${conf.cls}`}>
                            {conf.label}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {ev.details ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{ev.details}</p> : null}
                    {ev.sourceFileName ? (
                      <button
                        onClick={() => onOpenSection('evidence')}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-700"
                      >
                        <FileText className="h-3 w-3" /> {ev.sourceFileName}
                      </button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      ) : null}

      {/* Providers */}
      {providers.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <MedSection icon={MapPin} title="Providers on file" count={providers.length} />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {providers.map((p, i) => (
              <span key={`${p}-${i}`} className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                {p}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function EvidencePanel({
  leadId,
  assessmentId,
  clientName,
  initialFiles,
}: {
  leadId: string
  assessmentId: string | null
  clientName: string
  initialFiles: any[]
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [docs, setDocs] = useState<any[]>(initialFiles || [])
  const [uploading, setUploading] = useState(false)
  const [category, setCategory] = useState('other')
  const [description, setDescription] = useState('')
  const [requestOpen, setRequestOpen] = useState(false)
  const [requested, setRequested] = useState<string[]>([])
  const [requestMessage, setRequestMessage] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [openRequests, setOpenRequests] = useState<AttorneyDocumentRequest[]>([])
  const [banner, setBanner] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent')
  const [dragOver, setDragOver] = useState(false)
  const [groupByCategory, setGroupByCategory] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<any | null>(null)
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  // Dec-page → policy-limit capture. `coverageOpen` holds the file name that
  // triggered the prompt so the attorney has context.
  const [coverageOpen, setCoverageOpen] = useState<string | null>(null)
  const [coverageCarrier, setCoverageCarrier] = useState('')
  const [coverageLimit, setCoverageLimit] = useState('')
  const [coverageSaving, setCoverageSaving] = useState(false)

  const refreshDocs = () => {
    getLeadEvidenceFiles(leadId)
      .then((files: any) => Array.isArray(files) && setDocs(files))
      .catch(() => {})
  }
  const refreshRequests = () => {
    getAttorneyDocumentRequests()
      .then((rs) => setOpenRequests((rs || []).filter((r) => r.leadId === leadId && r.status !== 'completed')))
      .catch(() => {})
  }

  useEffect(() => {
    refreshDocs()
    refreshRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId])

  // Prevent the browser's default "open the dropped file" behavior. Without this,
  // a file dropped anywhere outside the dropzone navigates the tab to the file and
  // unloads the SPA (which is why the view resets to New Matches).
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault()
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', prevent)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', prevent)
    }
  }, [])

  // Reject unsupported types / oversized files before hitting the network so the
  // attorney gets instant feedback instead of a slow server error.
  const validateFiles = (list: File[]): { valid: File[]; rejected: string[] } => {
    const valid: File[] = []
    const rejected: string[] = []
    for (const f of list) {
      const ext = fileExt(f.name)
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        rejected.push(`${f.name} — unsupported type`)
        continue
      }
      if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
        rejected.push(`${f.name} — over ${MAX_UPLOAD_MB} MB`)
        continue
      }
      valid.push(f)
    }
    return { valid, rejected }
  }

  const uploadFiles = async (
    list: File[],
    opts?: { categoryOverride?: string; descriptionOverride?: string },
  ): Promise<boolean> => {
    if (!list.length) return false
    if (!assessmentId) {
      setBanner({ tone: 'err', text: 'This case is missing an assessment reference; cannot upload.' })
      return false
    }
    const { valid, rejected } = validateFiles(list)
    if (rejected.length) {
      setBanner({ tone: 'err', text: `Skipped ${rejected.length}: ${rejected.join('; ')}` })
    }
    if (!valid.length) {
      if (fileInputRef.current) fileInputRef.current.value = ''
      return false
    }
    if (valid.length > 10) {
      setBanner({ tone: 'err', text: 'You can upload at most 10 files at a time.' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return false
    }
    const cat = opts?.categoryOverride ?? category
    const desc = opts?.descriptionOverride ?? description
    setUploading(true)
    if (!rejected.length) setBanner(null)
    let succeeded = false
    try {
      // Upload through the attorney "on behalf" endpoint (authorized by case
      // assignment). The generic /v1/evidence endpoint checks assessment
      // ownership and 403s for the attorney. Endpoint is single-file, so loop.
      const created: any[] = []
      const failedNames: string[] = []
      for (const file of valid) {
        try {
          const rec = await uploadLeadEvidenceOnBehalf(leadId, file, { category: cat, description: desc })
          const doc = rec?.id ? rec : rec?.file || rec?.evidenceFile || rec
          if (doc?.id) created.push(doc)
        } catch (e: any) {
          failedNames.push(`${file.name} — ${e?.response?.data?.error || 'failed'}`)
        }
      }
      if (created.length) {
        setDocs((prev) => [...created, ...prev])
        succeeded = true
      }
      if (failedNames.length) {
        setBanner({ tone: 'err', text: `Some files failed: ${failedNames.join('; ')}` })
      }
      if (!opts) setDescription('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (succeeded) {
        setBanner((b) => (b && b.tone === 'err' ? b : { tone: 'ok', text: `Uploaded ${created.length} document${created.length === 1 ? '' : 's'}.` }))
        // Keep the flat list authoritative (server enrichment, provenance, etc.).
        refreshDocs()
      }
      // If the attorney filed a dec page / insurance doc, offer to capture the
      // policy limit right away so the coverage ceiling flows into the Overview.
      if (succeeded && cat === 'insurance') setCoverageOpen(valid[0]?.name || 'insurance document')
    } catch (err: any) {
      setBanner({ tone: 'err', text: err?.response?.data?.error || 'Upload failed.' })
    } finally {
      setUploading(false)
    }
    return succeeded
  }

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await uploadFiles(Array.from(e.target.files || []))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const list = Array.from(e.dataTransfer?.files || [])
    if (list.length) uploadFiles(list)
  }

  const requestCategory = (reqLabel: string) => {
    setRequested((prev) => (prev.includes(reqLabel) ? prev : [...prev, reqLabel]))
    setRequestOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this document?')) return
    try {
      await deleteLeadEvidence(leadId, id)
      setDocs((prev) => prev.filter((d) => d.id !== id))
      setSelected((prev) => {
        if (!prev.has(id)) return prev
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      if (previewDoc?.id === id) setPreviewDoc(null)
    } catch {
      setBanner({ tone: 'err', text: 'Could not delete the document.' })
    }
  }

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const setSelectionForVisible = (ids: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)))
      return next
    })

  const toggleCollapsed = (cat: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })

  const bulkDownload = async () => {
    const targets = docs.filter((d) => selected.has(d.id))
    if (!targets.length) return
    setBulkBusy(true)
    setBanner(null)
    let failures = 0
    for (const d of targets) {
      const url = d.fileUrl || d.url
      if (!url) {
        failures += 1
        continue
      }
      try {
        await downloadEvidenceByUrl(url, d.originalName || d.filename || 'document')
      } catch {
        failures += 1
      }
    }
    setBulkBusy(false)
    setBanner(
      failures
        ? { tone: 'err', text: `Downloaded ${targets.length - failures} of ${targets.length}; ${failures} failed.` }
        : { tone: 'ok', text: `Downloaded ${targets.length} document(s).` },
    )
  }

  const bulkDelete = async () => {
    const ids = [...selected]
    if (!ids.length) return
    if (!window.confirm(`Delete ${ids.length} document(s)? This cannot be undone.`)) return
    setBulkBusy(true)
    setBanner(null)
    let failures = 0
    for (const id of ids) {
      try {
        await deleteLeadEvidence(leadId, id)
      } catch {
        failures += 1
      }
    }
    const failedSet = new Set<string>()
    setDocs((prev) => prev.filter((d) => !ids.includes(d.id) || failedSet.has(d.id)))
    setSelected(new Set())
    setBulkBusy(false)
    setBanner(
      failures
        ? { tone: 'err', text: `Deleted ${ids.length - failures} of ${ids.length}; ${failures} failed.` }
        : { tone: 'ok', text: `Deleted ${ids.length} document(s).` },
    )
  }

  const startReplace = (id: string) => {
    setReplacingId(id)
    replaceInputRef.current?.click()
  }

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target.files || [])[0]
    e.target.value = ''
    const oldId = replacingId
    setReplacingId(null)
    if (!file || !oldId) return
    const oldDoc = docs.find((d) => d.id === oldId)
    if (!oldDoc) return
    const ok = await uploadFiles([file], {
      categoryOverride: oldDoc.category || 'other',
      descriptionOverride: oldDoc.description || '',
    })
    if (ok) {
      try {
        await deleteLeadEvidence(leadId, oldId)
        setDocs((prev) => prev.filter((d) => d.id !== oldId))
        setBanner({ tone: 'ok', text: `Replaced “${oldDoc.originalName || oldDoc.filename || 'document'}”.` })
      } catch {
        setBanner({ tone: 'err', text: 'Uploaded the new file, but could not remove the old version.' })
      }
    }
  }

  const saveCoverage = async () => {
    if (!coverageCarrier.trim()) {
      setBanner({ tone: 'err', text: 'Enter the carrier name to record coverage.' })
      return
    }
    setCoverageSaving(true)
    try {
      const limit = Number(String(coverageLimit).replace(/[^0-9.]/g, ''))
      await createLeadInsurance(leadId, {
        carrierName: coverageCarrier.trim(),
        policyLimit: Number.isFinite(limit) && limit > 0 ? limit : null,
        coverageConfirmed: true,
      })
      setBanner({ tone: 'ok', text: 'Policy coverage recorded from the dec page.' })
      setCoverageOpen(null)
      setCoverageCarrier('')
      setCoverageLimit('')
    } catch (err: any) {
      setBanner({ tone: 'err', text: err?.response?.data?.error || 'Could not record coverage.' })
    } finally {
      setCoverageSaving(false)
    }
  }

  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const handleDownload = async (doc: any) => {
    const fileUrl = doc.fileUrl || doc.url
    if (!fileUrl) {
      setBanner({ tone: 'err', text: 'This document has no downloadable file.' })
      return
    }
    setDownloadingId(doc.id)
    setBanner(null)
    try {
      await downloadEvidenceByUrl(fileUrl, doc.originalName || doc.filename || 'document')
    } catch {
      setBanner({ tone: 'err', text: 'Could not download the document.' })
    } finally {
      setDownloadingId(null)
    }
  }

  const toggleReq = (label: string) =>
    setRequested((prev) => (prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]))

  const submitRequest = async () => {
    if (!requested.length) {
      setBanner({ tone: 'err', text: 'Pick at least one document to request.' })
      return
    }
    setRequesting(true)
    setBanner(null)
    try {
      await createDocumentRequest(leadId, { requestedDocs: requested, customMessage: requestMessage || undefined })
      setBanner({ tone: 'ok', text: `Requested ${requested.length} document(s) from ${clientName}.` })
      setRequested([])
      setRequestMessage('')
      setRequestOpen(false)
      refreshRequests()
    } catch (err: any) {
      setBanner({ tone: 'err', text: err?.response?.data?.error || 'Could not send the request.' })
    } finally {
      setRequesting(false)
    }
  }

  const handleNudge = async (id: string) => {
    try {
      await nudgeDocumentRequest(id)
      setBanner({ tone: 'ok', text: 'Reminder sent to the client.' })
      refreshRequests()
    } catch {
      setBanner({ tone: 'err', text: 'Could not send the reminder.' })
    }
  }

  const apiOrigin = getApiOrigin() || (typeof window !== 'undefined' ? window.location.origin : '')

  // Derived views for the toolbar (search / filter / sort) and the summary strip.
  const query = search.trim().toLowerCase()
  const catCounts = docs.reduce<Record<string, number>>((acc, d) => {
    const c = d.category || 'other'
    acc[c] = (acc[c] || 0) + 1
    return acc
  }, {})
  const presentCats = new Set(Object.keys(catCounts))
  const totalSize = docs.reduce((s, d) => s + (Number(d.size) || 0), 0)
  const lastUpload = docs.reduce((m, d) => Math.max(m, Date.parse(d.createdAt || '') || 0), 0)
  const visibleDocs = docs
    .filter((d) => filterCat === 'all' || (d.category || 'other') === filterCat)
    .filter((d) => !query || (d.originalName || d.filename || '').toLowerCase().includes(query))
    .sort((a, b) =>
      sortBy === 'name'
        ? (a.originalName || a.filename || '').localeCompare(b.originalName || b.filename || '')
        : (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0),
    )
  const coverageMet = COVERAGE_CHECKLIST.filter((c) => presentCats.has(c.id)).length

  const catLabel = (id: string) =>
    UPLOAD_CATEGORIES.find((c) => c.id === id)?.label || (id || 'other').replace(/_/g, ' ')

  // Group the visible docs by category for the collapsible view, ordered by the
  // canonical category list with any stragglers appended.
  const groupedDocs = (() => {
    const map = new Map<string, any[]>()
    for (const d of visibleDocs) {
      const c = d.category || 'other'
      if (!map.has(c)) map.set(c, [])
      map.get(c)!.push(d)
    }
    const ordered = [
      ...UPLOAD_CATEGORIES.map((c) => c.id).filter((id) => map.has(id)),
      ...[...map.keys()].filter((id) => !UPLOAD_CATEGORIES.some((c) => c.id === id)),
    ]
    return ordered.map((cat) => ({ cat, label: catLabel(cat), items: map.get(cat)! }))
  })()

  const visibleIds = visibleDocs.map((d) => d.id)
  const selectedVisibleCount = visibleIds.filter((id) => selected.has(id)).length
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length

  const renderRow = (doc: any) => {
    const isImage = (doc.mimetype || doc.mimeType || '').startsWith('image/')
    const tone = evidenceStatusTone(doc.processingStatus)
    const href = doc.fileUrl ? `${apiOrigin}${doc.fileUrl}` : null
    const source = evidenceSource(doc)
    const hasAi = Boolean(doc.aiSummary || parseHighlights(doc.aiHighlights).length)
    const isSelected = selected.has(doc.id)
    return (
      <li
        key={doc.id}
        className={`flex items-center justify-between gap-3 px-3 py-2.5 transition ${
          isSelected ? 'bg-brand-50/60' : 'hover:bg-slate-50/70'
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelect(doc.id)}
            className="h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
            aria-label={`Select ${doc.originalName || doc.filename || 'document'}`}
          />
          <button
            type="button"
            onClick={() => setPreviewDoc(doc)}
            className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md border border-slate-200 bg-slate-50"
            title="Preview"
          >
            {isImage ? <ImageIcon className="h-4 w-4 text-brand-500" /> : <FileText className="h-4 w-4 text-slate-400" />}
            {isImage && href ? (
              <img
                src={href}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : null}
          </button>
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setPreviewDoc(doc)}
              className="block max-w-full truncate text-left text-sm font-medium text-slate-800 hover:text-brand-700"
            >
              {doc.originalName || doc.filename || 'Document'}
            </button>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
              <span className="capitalize">{(doc.category || 'file').replace(/_/g, ' ')}</span>
              {doc.size ? <span>· {formatSize(doc.size)}</span> : null}
              {doc.createdAt ? <span>· {formatDate(doc.createdAt)}</span> : null}
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[source.tone]}`}>{source.label}</span>
              {hasAi ? (
                <span className="inline-flex items-center gap-0.5 rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                  <Sparkles className="h-3 w-3" /> AI
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className={`mr-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[tone]}`}>
            {evidenceStatusLabel(doc.processingStatus)}
          </span>
          <button
            type="button"
            onClick={() => setPreviewDoc(doc)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
            title="Preview"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDownload(doc)}
            disabled={downloadingId === doc.id}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 disabled:opacity-50"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => startReplace(doc.id)}
            disabled={uploading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 disabled:opacity-50"
            title="Replace with a new version"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(doc.id)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </li>
    )
  }

  return (
    <div className="space-y-5">
      {banner ? (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            banner.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}
        >
          {banner.text}
        </div>
      ) : null}

      {/* Evidence coverage + at-a-glance stats */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-brand-600" />
            <p className="text-sm font-semibold text-slate-800">Evidence coverage</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {coverageMet}/{COVERAGE_CHECKLIST.length} core docs
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>
              <span className="font-semibold text-slate-800">{docs.length}</span> documents
            </span>
            {totalSize ? (
              <span>
                <span className="font-semibold text-slate-800">{formatSize(totalSize)}</span> total
              </span>
            ) : null}
            <span>
              <span className="font-semibold text-slate-800">{presentCats.size}</span> categories
            </span>
            {lastUpload ? <span>Updated {formatDate(new Date(lastUpload).toISOString())}</span> : null}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {COVERAGE_CHECKLIST.map((c) => {
            const have = presentCats.has(c.id)
            return have ? (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
              >
                <Check className="h-3.5 w-3.5" />
                {c.label}
                <span className="text-emerald-500">· {catCounts[c.id] || 0}</span>
              </span>
            ) : (
              <button
                key={c.id}
                type="button"
                onClick={() => requestCategory(c.req)}
                title={`Request ${c.label} from ${clientName || 'the client'}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:border-brand-300 hover:text-brand-700"
              >
                <Plus className="h-3.5 w-3.5" />
                {c.label}
                <span className="text-slate-400">· request</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Actions: upload + request */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            if (!dragOver) setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-xl border p-4 transition ${dragOver ? 'border-brand-400 bg-brand-50/60' : 'border-slate-200 bg-white'}`}
        >
          <p className="text-sm font-semibold text-slate-800">Add a document</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                {UPLOAD_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs font-medium text-slate-500">
              Description (optional)
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description"
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFiles}
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.txt"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-3 flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-200 px-4 py-6 text-center transition hover:border-brand-300 hover:bg-slate-50 disabled:opacity-50"
          >
            <Upload className={`h-5 w-5 ${dragOver ? 'text-brand-500' : 'text-slate-400'}`} />
            <span className="text-sm font-medium text-slate-600">
              {uploading ? 'Uploading…' : dragOver ? 'Drop to upload' : 'Drag & drop or click to upload'}
            </span>
            <span className="text-xs text-slate-400">PDF, DOC, or images · up to 10 files · max {MAX_UPLOAD_MB} MB each · category “{UPLOAD_CATEGORIES.find((c) => c.id === category)?.label || category}”</span>
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Request from client</p>
            <button
              type="button"
              onClick={() => setRequestOpen((v) => !v)}
              className="text-xs font-semibold text-brand-700 hover:text-brand-800"
            >
              {requestOpen ? 'Cancel' : 'New request'}
            </button>
          </div>
          {requestOpen ? (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                {REQUESTABLE_DOCS.map((doc) => {
                  const on = requested.includes(doc)
                  return (
                    <button
                      key={doc}
                      type="button"
                      onClick={() => toggleReq(doc)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                        on ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-brand-300'
                      }`}
                    >
                      {doc}
                    </button>
                  )
                })}
              </div>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={2}
                placeholder={`Optional note to ${clientName || 'the client'}…`}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <button
                type="button"
                onClick={submitRequest}
                disabled={requesting}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {requesting ? 'Sending…' : 'Send request'}
              </button>
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-400">
              Send the client a secure upload link for records, bills, and photos.
            </p>
          )}

          {openRequests.length > 0 ? (
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
              {openRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate text-slate-600">
                    <span className="font-medium text-slate-700">{r.requestedDocs?.length || 0} doc(s)</span> · {r.status}
                    {typeof r.uploadedCount === 'number' ? ` · ${r.uploadedCount} uploaded` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleNudge(r.id)}
                    className="shrink-0 rounded border border-slate-200 px-2 py-1 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Nudge
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Hidden input used by the per-row "replace" action */}
      <input ref={replaceInputRef} type="file" onChange={handleReplaceFile} className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.txt" />

      {/* Document list + toolbar */}
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm font-semibold text-slate-800">
            Documents{' '}
            <span className="text-slate-400">
              ({visibleDocs.length}
              {visibleDocs.length !== docs.length ? ` of ${docs.length}` : ''})
            </span>
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files"
              className="w-40 rounded-lg border border-slate-200 py-1.5 pl-8 pr-2.5 text-sm text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="all">All categories</option>
            {UPLOAD_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
                {catCounts[c.id] ? ` (${catCounts[c.id]})` : ''}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'name')}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            <option value="recent">Newest first</option>
            <option value="name">Name (A–Z)</option>
          </select>
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setGroupByCategory(false)}
              className={`px-2.5 py-1.5 text-xs font-semibold transition ${
                !groupByCategory ? 'bg-brand-50 text-brand-700' : 'bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setGroupByCategory(true)}
              className={`border-l border-slate-200 px-2.5 py-1.5 text-xs font-semibold transition ${
                groupByCategory ? 'bg-brand-50 text-brand-700' : 'bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              Group
            </button>
          </div>
        </div>

        {/* Bulk selection bar */}
        {visibleDocs.length > 0 ? (
          <div className="mb-2 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm">
            <label className="inline-flex items-center gap-2 font-medium text-slate-600">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                ref={(el) => {
                  if (el) el.indeterminate = selectedVisibleCount > 0 && !allVisibleSelected
                }}
                onChange={(e) => setSelectionForVisible(visibleIds, e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
              />
              {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
            </label>
            {selected.size > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={bulkDownload}
                  disabled={bulkBusy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" /> {bulkBusy ? 'Working…' : 'Download'}
                </button>
                <button
                  type="button"
                  onClick={bulkDelete}
                  disabled={bulkBusy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Clear
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {docs.length === 0 ? (
          <EmptyState message="No documents on this case yet. Upload one or request from the client." />
        ) : visibleDocs.length === 0 ? (
          <EmptyState message="No documents match your search or filter." />
        ) : groupByCategory ? (
          <div className="space-y-3">
            {groupedDocs.map((group) => {
              const isCollapsed = collapsed.has(group.cat)
              return (
                <div key={group.cat} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => toggleCollapsed(group.cat)}
                    className="flex w-full items-center gap-2 bg-slate-50/70 px-3 py-2 text-left"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                    <span className="text-sm font-semibold capitalize text-slate-700">{group.label}</span>
                    <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {group.items.length}
                    </span>
                  </button>
                  {isCollapsed ? null : <ul className="divide-y divide-slate-100">{group.items.map((doc) => renderRow(doc))}</ul>}
                </div>
              )
            })}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {visibleDocs.map((doc) => renderRow(doc))}
          </ul>
        )}
      </div>

      {/* Dec-page → policy-limit capture */}
      {coverageOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => (coverageSaving ? null : setCoverageOpen(null))}>
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50">
                <Shield className="h-5 w-5 text-brand-600" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">Record policy coverage</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  You filed “{coverageOpen}”. Capture the policy limit so it flows into the case Overview.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-medium text-slate-500">
                Carrier
                <input
                  type="text"
                  value={coverageCarrier}
                  onChange={(e) => setCoverageCarrier(e.target.value)}
                  placeholder="e.g. State Farm"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
              <label className="block text-xs font-medium text-slate-500">
                Policy limit (USD)
                <input
                  type="text"
                  inputMode="numeric"
                  value={coverageLimit}
                  onChange={(e) => setCoverageLimit(e.target.value)}
                  placeholder="e.g. 100000"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCoverageOpen(null)}
                disabled={coverageSaving}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={saveCoverage}
                disabled={coverageSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {coverageSaving ? 'Saving…' : 'Save coverage'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {previewDoc ? (
        <EvidencePreviewDrawer
          doc={previewDoc}
          apiOrigin={apiOrigin}
          onClose={() => setPreviewDoc(null)}
          onDownload={() => handleDownload(previewDoc)}
        />
      ) : null}
    </div>
  )
}

// Slide-over that previews the file inline (image/PDF), surfaces any AI
// extraction (summary + highlights) and shows the provenance/audit trail.
function EvidencePreviewDrawer({
  doc,
  apiOrigin,
  onClose,
  onDownload,
}: {
  doc: any
  apiOrigin: string
  onClose: () => void
  onDownload: () => void
}) {
  const href = doc.fileUrl ? `${apiOrigin}${doc.fileUrl}` : null
  const mime = String(doc.mimetype || doc.mimeType || '')
  const isImage = mime.startsWith('image/')
  const isPdf = mime === 'application/pdf' || fileExt(doc.originalName || doc.filename || '') === 'pdf'
  const highlights = parseHighlights(doc.aiHighlights)
  const source = evidenceSource(doc)
  const canEmbed = isImage || isPdf
  // Load the file through the authenticated API client as a same-origin blob URL.
  // Embedding the API URL directly fails cross-origin (X-Frame-Options / mixed
  // host), which is why a new tab works but the inline iframe/img does not.
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>(canEmbed ? 'loading' : 'idle')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!doc.fileUrl || !canEmbed) return
    let cancelled = false
    let created: string | null = null
    setLoadState('loading')
    getEvidenceObjectUrl(doc.fileUrl)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        created = url
        setBlobUrl(url)
        setLoadState('idle')
      })
      .catch(() => {
        if (!cancelled) setLoadState('error')
      })
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.fileUrl])

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{doc.originalName || doc.filename || 'Document'}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span className="capitalize">{(doc.category || 'file').replace(/_/g, ' ')}</span>
              {doc.size ? <span>· {formatSize(doc.size)}</span> : null}
              {doc.createdAt ? <span>· {formatDate(doc.createdAt)}</span> : null}
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[source.tone]}`}>{source.label}</span>
              {doc.isHIPAA ? (
                <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">HIPAA</span>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onDownload}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </button>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                title="Open in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" title="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid place-items-center bg-slate-100 p-3" style={{ minHeight: '16rem' }}>
            {canEmbed && loadState === 'loading' ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-400">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <p className="text-sm">Loading preview…</p>
              </div>
            ) : canEmbed && loadState === 'error' ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-400">
                <FileText className="h-8 w-8" />
                <p className="text-sm">Preview couldn’t load.</p>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                    Open in a new tab
                  </a>
                ) : null}
              </div>
            ) : blobUrl && isImage ? (
              <img src={blobUrl} alt={doc.originalName || ''} className="max-h-[60vh] w-auto rounded-lg object-contain" />
            ) : blobUrl && isPdf ? (
              <iframe title="document preview" src={blobUrl} className="h-[60vh] w-full rounded-lg border-0 bg-white" />
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-400">
                <FileText className="h-8 w-8" />
                <p className="text-sm">No inline preview for this file type.</p>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                    Open in a new tab
                  </a>
                ) : null}
              </div>
            )}
          </div>

          {doc.aiSummary || highlights.length ? (
            <div className="border-t border-slate-100 p-4">
              <div className="mb-2 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-violet-600" />
                <p className="text-sm font-semibold text-slate-800">AI extraction</p>
              </div>
              {doc.aiSummary ? <p className="text-sm leading-relaxed text-slate-600">{doc.aiSummary}</p> : null}
              {highlights.length ? (
                <ul className="mt-2 space-y-1.5">
                  {highlights.slice(0, 8).map((h, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-600">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <div className="border-t border-slate-100 p-4 text-sm text-slate-400">
              No AI extraction yet — processing status: {evidenceStatusLabel(doc.processingStatus).toLowerCase()}.
            </div>
          )}

          <div className="border-t border-slate-100 p-4">
            <p className="mb-2 text-sm font-semibold text-slate-800">Details</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-slate-400">Source</dt>
                <dd className="text-slate-700">{source.label}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Uploaded</dt>
                <dd className="text-slate-700">{doc.createdAt ? formatDate(doc.createdAt) : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Type</dt>
                <dd className="truncate text-slate-700">{mime || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Status</dt>
                <dd className="text-slate-700">{evidenceStatusLabel(doc.processingStatus)}</dd>
              </div>
              {doc.description ? (
                <div className="col-span-2">
                  <dt className="text-xs text-slate-400">Description</dt>
                  <dd className="text-slate-700">{doc.description}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

function evidenceStatusLabel(status?: string) {
  const s = (status || '').toLowerCase()
  if (s === 'completed' || s === 'processed' || s === 'verified') return 'Verified'
  if (s === 'processing' || s === 'pending') return 'Processing'
  if (s === 'failed') return 'Needs review'
  return 'Received'
}

function evidenceStatusTone(status?: string): Tone {
  const s = (status || '').toLowerCase()
  if (s === 'completed' || s === 'processed' || s === 'verified') return 'success'
  if (s === 'failed') return 'danger'
  if (s === 'processing' || s === 'pending') return 'warning'
  return 'neutral'
}

function Metric({ label, value, accent = false }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        accent ? 'border-brand-100 bg-brand-50/50' : 'border-slate-200 bg-slate-50/60'
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold leading-tight ${accent ? 'text-brand-700' : 'text-slate-900'}`}>{value}</p>
    </div>
  )
}

function Note({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tasks tab — full CRUD work list for a case.
// ---------------------------------------------------------------------------

const TASK_PRIORITIES = [
  { id: 'high', label: 'High', badge: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  { id: 'medium', label: 'Medium', badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  { id: 'low', label: 'Low', badge: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
] as const

const PRIORITY_META: Record<string, (typeof TASK_PRIORITIES)[number]> = {
  high: TASK_PRIORITIES[0],
  medium: TASK_PRIORITIES[1],
  low: TASK_PRIORITIES[2],
}

const TASK_TYPES = [
  { id: 'general', label: 'General' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'medical', label: 'Medical records' },
  { id: 'client', label: 'Client follow-up' },
  { id: 'demand', label: 'Demand prep' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'filing', label: 'Filing / court' },
  { id: 'deadline', label: 'Deadline' },
]

const TASK_TYPE_LABEL: Record<string, string> = Object.fromEntries(TASK_TYPES.map((t) => [t.id, t.label]))

interface TaskFormState {
  title: string
  dueDate: string
  priority: string
  taskType: string
  notes: string
}

const EMPTY_TASK_FORM: TaskFormState = { title: '', dueDate: '', priority: 'medium', taskType: 'general', notes: '' }

const isDone = (t: TaskRow) => String(t.status || '').toLowerCase() === 'done'

/** Due-date countdown chip (overdue / today / soon / later). */
function dueChip(dueDate?: string | null): { label: string; cls: string } | null {
  if (!dueDate) return null
  const t = Date.parse(dueDate)
  if (Number.isNaN(t)) return null
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const d = Math.floor((new Date(t).setHours(0, 0, 0, 0) - startOfToday.getTime()) / 86_400_000)
  if (d < 0) return { label: `${Math.abs(d)}d overdue`, cls: 'bg-rose-50 text-rose-700 ring-rose-200' }
  if (d === 0) return { label: 'Due today', cls: 'bg-amber-50 text-amber-700 ring-amber-200' }
  if (d <= 7) return { label: `in ${d}d`, cls: 'bg-amber-50 text-amber-700 ring-amber-200' }
  return { label: `in ${d}d`, cls: 'bg-slate-100 text-slate-600 ring-slate-200' }
}

function TaskStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <p className={`text-lg font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  )
}

function TasksPanel({ leadId, tasks, reload }: { leadId: string; tasks: TaskRow[]; reload: () => Promise<void> | void }) {
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TaskFormState>(EMPTY_TASK_FORM)
  const [showDone, setShowDone] = useState(false)

  const load = async () => {
    await reload()
  }

  const flash = (tone: 'ok' | 'err', text: string) => {
    setMsg({ tone, text })
    window.setTimeout(() => setMsg(null), 3500)
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_TASK_FORM)
    setFormOpen(true)
  }

  const openEdit = (t: TaskRow) => {
    setEditingId(t.id)
    setForm({
      title: t.title || '',
      dueDate: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : '',
      priority: (t.priority || 'medium').toLowerCase(),
      taskType: t.taskType || 'general',
      notes: t.notes || '',
    })
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setForm(EMPTY_TASK_FORM)
  }

  const submit = async () => {
    if (!form.title.trim()) {
      flash('err', 'Task title is required.')
      return
    }
    setBusy('save')
    const payload = {
      title: form.title.trim(),
      dueDate: form.dueDate || null,
      priority: form.priority,
      taskType: form.taskType,
      notes: form.notes.trim() || null,
    }
    try {
      if (editingId) {
        await updateLeadTask(leadId, editingId, payload)
        flash('ok', 'Task updated.')
      } else {
        await createLeadTask(leadId, payload)
        flash('ok', 'Task added.')
      }
      closeForm()
      await load()
    } catch (err: any) {
      flash('err', err?.response?.data?.error || 'Failed to save task.')
    } finally {
      setBusy(null)
    }
  }

  const toggleDone = async (t: TaskRow) => {
    setBusy(t.id)
    try {
      await updateLeadTask(leadId, t.id, { status: isDone(t) ? 'open' : 'done' })
      await load()
    } catch (err: any) {
      flash('err', err?.response?.data?.error || 'Failed to update task.')
    } finally {
      setBusy(null)
    }
  }

  const remove = async (t: TaskRow) => {
    if (!window.confirm(`Delete task "${t.title}"? This can't be undone.`)) return
    setBusy(t.id)
    try {
      await deleteLeadTask(leadId, t.id)
      flash('ok', 'Task deleted.')
      await load()
    } catch (err: any) {
      flash('err', err?.response?.data?.error || 'Failed to delete task.')
    } finally {
      setBusy(null)
    }
  }

  const generate = async () => {
    setBusy('generate')
    try {
      const res = await createLeadTasksFromReadiness(leadId)
      flash('ok', res?.createdCount ? `Added ${res.createdCount} task${res.createdCount === 1 ? '' : 's'} from case readiness.` : 'No new tasks needed — the case is on track.')
      await load()
    } catch (err: any) {
      flash('err', err?.response?.data?.error || 'Failed to generate tasks.')
    } finally {
      setBusy(null)
    }
  }

  const addSol = async () => {
    setBusy('sol')
    try {
      await createLeadSolTask(leadId)
      flash('ok', 'Statute-of-limitations deadline added.')
      await load()
    } catch (err: any) {
      flash('err', err?.response?.data?.error || 'Failed to add SOL deadline.')
    } finally {
      setBusy(null)
    }
  }

  const active = tasks.filter((t) => !isDone(t))
  const done = tasks.filter(isDone)

  const sortActive = (list: TaskRow[]) =>
    [...list].sort((a, b) => {
      const at = a.dueDate ? Date.parse(a.dueDate) : Infinity
      const bt = b.dueDate ? Date.parse(b.dueDate) : Infinity
      return at - bt
    })

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const overdueCount = active.filter((t) => t.dueDate && Date.parse(t.dueDate) < now.getTime()).length
  const dueSoonCount = active.filter((t) => {
    if (!t.dueDate) return false
    const diff = Math.floor((new Date(Date.parse(t.dueDate)).setHours(0, 0, 0, 0) - now.getTime()) / 86_400_000)
    return diff >= 0 && diff <= 7
  }).length

  const renderTask = (t: TaskRow) => {
    const p = PRIORITY_META[String(t.priority || 'medium').toLowerCase()] || PRIORITY_META.medium
    const chip = dueChip(t.dueDate)
    const taskDone = isDone(t)
    const rowBusy = busy === t.id
    return (
      <li key={t.id} className="group flex items-start gap-3 px-4 py-3">
        <button
          onClick={() => toggleDone(t)}
          disabled={rowBusy}
          className="mt-0.5 shrink-0 text-slate-300 transition hover:text-emerald-500 disabled:opacity-50"
          aria-label={taskDone ? 'Mark task open' : 'Mark task done'}
          title={taskDone ? 'Mark as open' : 'Mark as done'}
        >
          {rowBusy ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          ) : taskDone ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className={`text-sm font-medium ${taskDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{t.title}</p>
            {!taskDone && chip ? (
              <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${chip.cls}`}>
                {chip.label}
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            {!taskDone ? (
              <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold ring-1 ring-inset ${p.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} /> {p.label}
              </span>
            ) : null}
            {t.taskType && t.taskType !== 'general' ? <span>{TASK_TYPE_LABEL[t.taskType] || t.taskType}</span> : null}
            {t.dueDate ? <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{formatDate(t.dueDate)}</span> : null}
            {taskDone && t.completedAt ? <span className="text-emerald-600">Done {formatDate(t.completedAt)}</span> : null}
          </div>
          {t.notes ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{t.notes}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            onClick={() => openEdit(t)}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Edit task"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => remove(t)}
            disabled={rowBusy}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
            aria-label="Delete task"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </li>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="grid flex-1 grid-cols-3 gap-2 sm:max-w-md">
          <TaskStat label="Open" value={active.length} tone="text-slate-900" />
          <TaskStat label="Overdue" value={overdueCount} tone={overdueCount ? 'text-rose-600' : 'text-slate-900'} />
          <TaskStat label="Due ≤7d" value={dueSoonCount} tone={dueSoonCount ? 'text-amber-600' : 'text-slate-900'} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={generate}
            disabled={busy === 'generate'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"
            title="Auto-create tasks from the case's readiness blockers"
          >
            {busy === 'generate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-brand-500" />}
            Auto-generate
          </button>
          {!formOpen && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" /> Add task
            </button>
          )}
        </div>
      </div>

      {msg ? (
        <div
          className={`rounded-xl px-4 py-2.5 text-sm ${
            msg.tone === 'ok' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200'
          }`}
        >
          {msg.text}
        </div>
      ) : null}

      {/* Add / edit form */}
      {formOpen ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">{editingId ? 'Edit task' : 'New task'}</h4>
            <button onClick={closeForm} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-600" aria-label="Cancel">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Request updated medical records from Dr. Lin"
                autoFocus
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Due date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                >
                  {TASK_PRIORITIES.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Type</label>
                <select
                  value={form.taskType}
                  onChange={(e) => setForm((f) => ({ ...f, taskType: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Optional details or context"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={closeForm} className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={busy === 'save'}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
              >
                {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editingId ? 'Save changes' : 'Add task'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Active tasks */}
      {active.length ? (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {sortActive(active).map(renderTask)}
        </ul>
      ) : !formOpen ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
          <ListChecks className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-medium text-slate-600">No open tasks for this case</p>
          <p className="mt-0.5 text-xs text-slate-400">Add one manually, auto-generate from readiness, or drop in the filing deadline.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700">
              <Plus className="h-4 w-4" /> Add task
            </button>
            <button
              onClick={addSol}
              disabled={busy === 'sol'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              {busy === 'sol' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4 text-slate-400" />}
              Add filing deadline
            </button>
          </div>
        </div>
      ) : null}

      {/* Completed (collapsible) */}
      {done.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <button
            onClick={() => setShowDone((s) => !s)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-slate-50"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Completed
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{done.length}</span>
            </span>
            {showDone ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          </button>
          {showDone ? <ul className="divide-y divide-slate-100 border-t border-slate-100">{done.map(renderTask)}</ul> : null}
        </div>
      ) : null}
    </div>
  )
}

/** Vertical tick + label plotted on the negotiation ladder track. */
function LadderMarker({
  pct,
  label,
  value,
  color,
  align,
}: {
  pct: number
  label: string
  value: string
  color: 'amber' | 'brand' | 'emerald'
  align: 'top' | 'bottom'
}) {
  const line = { amber: 'bg-amber-500', brand: 'bg-brand-600', emerald: 'bg-emerald-600' }[color]
  const text = { amber: 'text-amber-600', brand: 'text-brand-700', emerald: 'text-emerald-700' }[color]
  return (
    <div className="absolute z-10" style={{ left: `${pct}%`, top: '50%', transform: 'translate(-50%, -50%)' }}>
      <div className={`h-6 w-0.5 rounded ${line}`} />
      <div
        className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center ${
          align === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}
      >
        <span className={`block text-[10px] font-semibold uppercase tracking-wide ${text}`}>{label}</span>
        <span className="block text-xs font-bold text-slate-800">{value}</span>
      </div>
    </div>
  )
}

function compactMoney(n?: number | null) {
  if (n == null || !Number.isFinite(n) || n <= 0) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${Math.round(n)}`
}

function readinessBar(score: number) {
  if (score >= 85) return 'bg-emerald-500'
  if (score >= 70) return 'bg-brand-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-rose-500'
}

/**
 * Clickable case-lifecycle tracker. Each milestone is derived from real command
 * center signals (retainer, evidence, treatment, demand, negotiation, resolution)
 * so the attorney can see at a glance what's actually been accomplished — and
 * click any step to jump straight to the tab where that work lives.
 */
function CaseProgressTracker({
  cc,
  lead,
  onNavigate,
}: {
  cc: CaseCommandCenter
  lead: any
  onNavigate: (section: string) => void
}) {
  const n = cc?.negotiationSummary
  const missingCount = (cc?.missingItems || []).length
  const readinessScore = Number(cc?.readiness?.score ?? 0)
  const treatmentEvents = Number(cc?.treatmentMonitor?.chronologyCount ?? 0)
  const status = String(lead?.status || '')
  const latestStatus = String(n?.latestStatus || '')

  const retained = status === 'retained'
  const evidenceComplete = missingCount === 0
  const treatmentTracked = treatmentEvents > 0
  const demandReady = readinessScore >= 70
  const demandSent = n?.latestDemand != null
  const inNegotiation = n?.latestOffer != null || Number(n?.eventCount ?? 0) > 0
  const resolved = /settl|resolv|closed/i.test(latestStatus)

  const steps: { key: string; label: string; section: string; Icon: ComponentType<{ className?: string }>; done: boolean; note: string }[] = [
    { key: 'retained', label: 'Retained', section: 'signatures', Icon: PenLine, done: retained, note: retained ? 'Representation active' : 'Retainer pending' },
    { key: 'evidence', label: 'Evidence', section: 'evidence', Icon: FolderOpen, done: evidenceComplete, note: evidenceComplete ? 'Records gathered' : `${missingCount} item${missingCount === 1 ? '' : 's'} needed` },
    { key: 'medical', label: 'Treatment', section: 'medical', Icon: Stethoscope, done: treatmentTracked, note: treatmentTracked ? `${treatmentEvents} event${treatmentEvents === 1 ? '' : 's'}` : 'Not logged yet' },
    { key: 'demand', label: 'Demand', section: 'demand', Icon: Gavel, done: demandSent, note: demandSent ? `Sent · ${money(n?.latestDemand)}` : demandReady ? 'Ready to send' : 'Building readiness' },
    { key: 'negotiation', label: 'Negotiation', section: 'negotiation', Icon: Handshake, done: inNegotiation, note: inNegotiation ? (n?.latestOffer != null ? `Offer · ${money(n.latestOffer)}` : `${n?.eventCount} events`) : 'Not started' },
    { key: 'resolved', label: 'Resolved', section: 'billing', Icon: Receipt, done: resolved, note: resolved ? 'Settled' : 'Open' },
  ]

  const currentIndex = steps.findIndex((s) => !s.done)
  const doneCount = steps.filter((s) => s.done).length
  const pct = Math.round((doneCount / steps.length) * 100)

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Case progress</p>
        <span className="text-xs text-slate-500">
          {doneCount} of {steps.length} milestones · <span className="font-bold text-slate-900">{pct}%</span>
        </span>
      </div>
      <div className="flex items-start overflow-x-auto pb-1">
        {steps.map((s, i) => {
          const state = s.done ? 'done' : i === currentIndex ? 'current' : 'upcoming'
          const badge =
            state === 'done'
              ? 'bg-emerald-500 text-white'
              : state === 'current'
                ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                : 'bg-slate-100 text-slate-400'
          const StepIcon = s.Icon
          return (
            <Fragment key={s.key}>
              {i > 0 ? (
                <div className={`mt-4 h-0.5 min-w-[16px] flex-1 ${steps[i - 1].done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              ) : null}
              <button
                type="button"
                onClick={() => onNavigate(s.section)}
                title={`Open ${s.label}`}
                className="flex w-[104px] shrink-0 flex-col items-center gap-1.5 rounded-lg px-1 py-1 text-center transition hover:bg-slate-50"
              >
                <span className={`grid h-9 w-9 place-items-center rounded-full transition ${badge}`}>
                  {s.done ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                </span>
                <span className={`text-xs font-semibold ${state === 'upcoming' ? 'text-slate-400' : 'text-slate-800'}`}>{s.label}</span>
                <span className="text-[11px] leading-tight text-slate-500">{s.note}</span>
              </button>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

function MeterCard({
  label,
  percent,
  caption,
  barClass,
  breakdown,
}: {
  label: string
  percent: number
  caption?: string
  barClass: string
  breakdown?: Array<{ key: string; label: string; points: number; max: number; hint?: string }>
}) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)))
  const hasBreakdown = Array.isArray(breakdown) && breakdown.length > 0
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
          {hasBreakdown ? (
            <span className="group relative inline-flex">
              <Info className="h-3.5 w-3.5 cursor-help text-slate-400" />
              <span className="pointer-events-none absolute left-0 top-6 z-30 hidden w-64 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-lg group-hover:block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  What's driving this score
                </span>
                {breakdown!.map((f) => {
                  const full = f.points >= f.max
                  const dot = full ? 'bg-emerald-500' : f.points > 0 ? 'bg-amber-500' : 'bg-slate-300'
                  const val = full ? 'text-emerald-600' : f.points > 0 ? 'text-amber-600' : 'text-slate-400'
                  return (
                    <span key={f.key} className="mb-1.5 flex items-start justify-between gap-2 text-xs last:mb-0">
                      <span className="flex items-start gap-1.5 text-slate-600">
                        <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                        <span>
                          {f.label}
                          {f.hint && !full ? (
                            <span className="block text-[11px] leading-tight text-slate-400">{f.hint}</span>
                          ) : null}
                        </span>
                      </span>
                      <span className={`shrink-0 font-semibold tabular-nums ${val}`}>
                        +{f.points}/{f.max}
                      </span>
                    </span>
                  )
                })}
              </span>
            </span>
          ) : null}
        </span>
        <span className="text-sm font-bold text-slate-900">{pct}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
      {caption ? <p className="mt-1.5 truncate text-xs text-slate-500">{caption}</p> : null}
    </div>
  )
}

const POSTURE_ACCENT: Record<'emerald' | 'amber' | 'rose', { text: string; dot: string }> = {
  emerald: { text: 'text-emerald-700', dot: 'bg-emerald-500' },
  amber: { text: 'text-amber-700', dot: 'bg-amber-500' },
  rose: { text: 'text-rose-700', dot: 'bg-rose-500' },
}

function PostureCard({
  title,
  accent,
  items,
  empty,
}: {
  title: string
  accent: 'emerald' | 'amber' | 'rose'
  items?: Array<{ title: string; detail: string; severity: string }>
  empty: string
}) {
  const a = POSTURE_ACCENT[accent]
  const list = items || []
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className={`text-xs font-semibold uppercase tracking-wide ${a.text}`}>{title}</h4>
      {list.length ? (
        <ul className="mt-2.5 space-y-2">
          {list.slice(0, 4).map((it, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${a.dot}`} aria-hidden />
              <span className="min-w-0">
                <span className="font-medium text-slate-800">{it.title}</span>
                {it.detail ? <span className="text-slate-500"> — {it.detail}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-400">{empty}</p>
      )}
    </div>
  )
}

/** Compact narrative card for liability / coverage posture on the Demand tab. */
function StoryCard({ title, label, detail }: { title: string; label?: string | null; detail?: string | null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      <p className="mt-1.5 text-sm font-semibold text-slate-900">{label || '—'}</p>
      {detail ? <p className="mt-1 text-sm leading-relaxed text-slate-500">{detail}</p> : null}
    </div>
  )
}

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-rose-50 text-rose-700 ring-rose-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  low: 'bg-slate-100 text-slate-600 ring-slate-200',
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls = PRIORITY_BADGE[priority] || PRIORITY_BADGE.low
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${cls}`}>
      {priority}
    </span>
  )
}

function DataTable({
  headers,
  align,
  rows,
  tone,
}: {
  headers: string[]
  align: Array<'left' | 'right'>
  rows: ReactNode[][]
  tone?: Tone[]
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
              {headers.map((h, i) => (
                <th
                  key={h}
                  className={`border-b border-slate-200 px-4 py-2.5 ${align[i] === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className={`group transition-colors hover:bg-slate-50/70 ${tone ? ROW_TONE[tone[ri]] : 'text-slate-700'}`}
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`border-b border-slate-100 px-4 py-3 align-middle group-last:border-0 ${
                      align[ci] === 'right' ? 'text-right tabular-nums' : 'text-left'
                    } ${ci === 0 ? 'font-medium text-slate-800' : ''}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
