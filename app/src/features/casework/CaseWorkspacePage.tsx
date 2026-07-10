import { type ComponentType, type ReactNode, Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
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
  MapPin,
  MessageSquare,
  PenLine,
  Pill,
  Plus,
  Receipt,
  RefreshCw,
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
  deleteLeadEvidence,
  downloadEvidenceByUrl,
  getEvidenceObjectUrl,
  getAttorneyDashboard,
  getAttorneyDocumentRequests,
  getAttorneyTaskSummary,
  getLeadCommandCenter,
  getLeadEvidenceFiles,
  getLeadMedicalChronologySummary,
  nudgeDocumentRequest,
  uploadLeadEvidenceOnBehalf,
  type AttorneyDocumentRequest,
  type CaseCommandCenter,
  type MedicalChronologySummary,
} from '../../lib/api'
import { getApiOrigin } from '../../lib/runtimeEnv'
import SignatureRequestPanel from '../../components/SignatureRequestPanel'
import ChatDrawer from '../../components/ChatDrawer'
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

const TABS = ['Overview', 'Evidence', 'Signatures', 'Medical', 'Negotiation', 'Demand', 'Timeline', 'Deadlines', 'Billing', 'Tasks'] as const
type Tab = (typeof TABS)[number]

const SECTION_TO_TAB: Record<string, Tab> = {
  overview: 'Overview',
  evidence: 'Evidence',
  signatures: 'Signatures',
  esign: 'Signatures',
  // "Send retainer" and other e-sign deep-links land on the Signatures tab.
  documents: 'Signatures',
  medical: 'Medical',
  negotiation: 'Negotiation',
  demand: 'Demand',
  timeline: 'Timeline',
  chronology: 'Timeline',
  deadlines: 'Deadlines',
  billing: 'Billing',
  tasks: 'Tasks',
}

const TAB_TO_SECTION: Record<Tab, string> = {
  Overview: 'overview',
  Evidence: 'evidence',
  Signatures: 'signatures',
  Medical: 'medical',
  Negotiation: 'negotiation',
  Demand: 'demand',
  Timeline: 'timeline',
  Deadlines: 'deadlines',
  Billing: 'billing',
  Tasks: 'tasks',
}

type TabMeta = { icon: ComponentType<{ className?: string }>; blurb: string }

const TAB_META: Record<Tab, TabMeta> = {
  Overview: { icon: LayoutDashboard, blurb: 'Case status, next action, and readiness at a glance.' },
  Evidence: { icon: FolderOpen, blurb: 'Upload documents, request records, and track the case file.' },
  Signatures: { icon: PenLine, blurb: 'Send retainers and authorizations for e-signature.' },
  Medical: { icon: Stethoscope, blurb: 'Providers, treatment chronology, and cost benchmarks.' },
  Negotiation: { icon: Handshake, blurb: 'Demands, offers, and settlement posture.' },
  Demand: { icon: Gavel, blurb: 'Demand package, case value, and policy limits.' },
  Timeline: { icon: Clock, blurb: 'A chronological record of everything on this matter.' },
  Deadlines: { icon: CalendarClock, blurb: 'Statute of limitations and key case milestones.' },
  Billing: { icon: Receipt, blurb: 'Contingency fee and estimated client net.' },
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
  status?: string | null
  priority?: string | null
  taskType?: string | null
  leadId?: string | null
}

interface TaskSummary {
  overdue: TaskRow[]
  today: TaskRow[]
  upcoming: TaskRow[]
  noDueDate: TaskRow[]
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

  useEffect(() => {
    if (!leadId) return
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    setError(null)
    ;(async () => {
      try {
        const [dash, taskSummary] = await Promise.all([
          getAttorneyDashboard(),
          getAttorneyTaskSummary().catch(() => null),
        ])
        if (cancelled) return
        const found = ((dash?.recentLeads as any[]) || []).find((l: any) => l.id === leadId) || null
        setLead(found)
        if (!found) {
          setNotFound(true)
          return
        }
        const summary = (taskSummary || {}) as Partial<TaskSummary>
        const allTasks = [
          ...(summary.overdue || []),
          ...(summary.today || []),
          ...(summary.upcoming || []),
          ...(summary.noDueDate || []),
        ].filter((t) => t.leadId === leadId)
        setTasks(allTasks)
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

  if (!leadId) return <EmptyState message="No case selected." />

  return (
    <div className="space-y-4">
      <BackButton to="/attorney-dashboard/cases/active" label="Active cases" />

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

          {/* Tab strip — single row; distributes evenly, scrolls horizontally if the column is too narrow */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((t) => {
              const active = t === tab
              const TabIcon = TAB_META[t].icon
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => navigate(`/attorney-dashboard/cases/${leadId}/${TAB_TO_SECTION[t]}`)}
                  title={t}
                  aria-label={t}
                  className={`inline-flex flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-[13px] font-medium transition ${
                    active
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <TabIcon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span className="hidden xl:inline">{t}</span>
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
              <WorkstreamPanel tab={tab} section={section} lead={lead} detail={detail} cc={cc} tasks={tasks} onOpenChat={openChat} />
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
  onOpenChat,
}: {
  tab: Tab
  section?: string
  lead: any
  detail: CaseDetailVM
  cc: CaseCommandCenter | null
  tasks: TaskRow[]
  onOpenChat: (draft?: string) => void
}) {
  const navigate = useNavigate()
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [requestedDocKeys, setRequestedDocKeys] = useState<Set<string>>(new Set())

  const goToSection = (s: string) => navigate(`/attorney-dashboard/cases/${lead.id}/${s}`)

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

  if (tab === 'Negotiation') {
    const n = cc?.negotiationSummary
    if (!n || n.eventCount === 0) {
      return <Note>No demand or offers yet. Negotiation opens once the demand package is sent to the carrier.</Note>
    }
    const rows: string[][] = []
    const tone: Tone[] = []
    if (n.latestDemand != null) {
      rows.push([formatDate(n.latestEventDate), 'Demand (us)', 'Latest demand', money(n.latestDemand)])
      tone.push('neutral')
    }
    if (n.latestOffer != null) {
      rows.push([formatDate(n.latestEventDate), 'Insurer', n.latestStatus || 'Latest offer', money(n.latestOffer)])
      tone.push('info')
    }
    return (
      <div className="space-y-4">
        {rows.length ? (
          <DataTable headers={['Date', 'Party', 'Position', 'Amount']} align={['left', 'left', 'left', 'right']} rows={rows} tone={tone} />
        ) : (
          <Note>{`${n.eventCount} negotiation event(s) recorded.`}</Note>
        )}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Metric label="Posture" value={n.posture || '—'} />
          {n.gapToDemand != null ? <Metric label="Gap to demand" value={money(n.gapToDemand)} /> : null}
        </div>
        {n.recommendedMove ? <Note>{n.recommendedMove}</Note> : null}
      </div>
    )
  }

  if (tab === 'Demand') {
    const n = cc?.negotiationSummary
    const v = cc?.valueStory
    if (!v && (!n || n.latestDemand == null)) {
      return <Note>Demand not started. A demand package is prepared once treatment stabilizes and evidence is complete.</Note>
    }
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Metric label="Latest demand" value={money(n?.latestDemand)} />
          <Metric label="Case value (median)" value={money(v?.median || detail.caseValue)} />
          <Metric label="Policy limit" value={money(detail.policyLimit)} accent />
        </div>
        {v?.detail ? <Note>{v.detail}</Note> : null}
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
    const events: Array<{ date: string; event: string; by: string }> = []
    if (lead?.submittedAt) events.push({ date: lead.submittedAt, event: 'Case submitted', by: 'Client' })
    if (lead?.lastContactAt) events.push({ date: lead.lastContactAt, event: 'Client contact made', by: 'Attorney' })
    if (cc?.treatmentMonitor?.latestTreatmentDate)
      events.push({ date: cc.treatmentMonitor.latestTreatmentDate, event: 'Latest treatment recorded', by: 'Provider' })
    if (cc?.negotiationSummary?.latestEventDate)
      events.push({
        date: cc.negotiationSummary.latestEventDate,
        event: `Negotiation: ${cc.negotiationSummary.latestStatus || cc.negotiationSummary.latestEventType || 'update'}`,
        by: 'Carrier',
      })
    ;(a.evidenceFiles || []).forEach((f: any) => {
      if (f.createdAt) events.push({ date: f.createdAt, event: `Uploaded: ${f.filename || 'document'}`, by: 'Case team' })
    })
    if (!events.length) return <Note>No timeline events yet.</Note>
    events.sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime())
    return (
      <DataTable
        headers={['Date', 'Event', 'By']}
        align={['left', 'left', 'left']}
        rows={events.map((e) => [formatDate(e.date), e.event, e.by])}
      />
    )
  }

  if (tab === 'Deadlines') {
    const rows: string[][] = []
    const tone: Tone[] = []
    if (cc?.nextBestAction) {
      rows.push([cc.nextBestAction.title, '—', '—', 'Open'])
      tone.push('warning')
    }
    if (!rows.length) {
      return <Note>No tracked deadlines yet. Statute of limitations and case milestones appear here once set.</Note>
    }
    return <DataTable headers={['Deadline', 'Date', 'Time left', 'Status']} align={['left', 'left', 'right', 'left']} rows={rows} tone={tone} />
  }

  if (tab === 'Billing') {
    const gross = cc?.valueStory?.median || detail.caseValue
    if (!gross) return <Note>Billing estimates appear once the case has a value estimate.</Note>
    const rate = detail.claimType === 'medmal' ? 0.4 : 1 / 3
    const fee = gross * rate
    return (
      <DataTable
        headers={['Item', 'Basis', 'Amount']}
        align={['left', 'left', 'right']}
        rows={[
          ['Contingency fee', `${Math.round(rate * 100)}% of gross`, money(fee)],
          ['Case value (est.)', 'Gross recovery', money(gross)],
          ['Client net (est.)', 'After fees', money(gross - fee)],
        ]}
      />
    )
  }

  if (tab === 'Tasks') {
    if (!tasks.length) return <Note>No open tasks for this case.</Note>
    const rows = tasks.map((t) => [t.title, t.priority || 'Normal', formatDate(t.dueDate), t.status || 'Open'])
    const tone: Tone[] = tasks.map((t) => taskTone(t.dueDate))
    return <DataTable headers={['Task', 'Priority', 'Due', 'Status']} align={['left', 'left', 'left', 'left']} rows={rows} tone={tone} />
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

function taskTone(dueDate?: string | null): Tone {
  if (!dueDate) return 'neutral'
  const t = Date.parse(dueDate)
  if (Number.isNaN(t)) return 'neutral'
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const diff = Math.floor((new Date(t).setHours(0, 0, 0, 0) - startOfToday.getTime()) / 86_400_000)
  if (diff < 0) return 'danger'
  if (diff === 0) return 'warning'
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
