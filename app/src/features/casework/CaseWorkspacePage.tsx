import { type ComponentType, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Gavel,
  Handshake,
  Image as ImageIcon,
  Info,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  PenLine,
  Receipt,
  Send,
  Stethoscope,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  createDocumentRequest,
  deleteEvidenceFile,
  downloadEvidenceByUrl,
  getAttorneyDashboard,
  getAttorneyDocumentRequests,
  getAttorneyTaskSummary,
  getLeadCommandCenter,
  getLeadEvidenceFiles,
  nudgeDocumentRequest,
  uploadEvidenceFile,
  uploadMultipleEvidenceFiles,
  type AttorneyDocumentRequest,
  type CaseCommandCenter,
} from '../../lib/api'
import { getApiOrigin } from '../../lib/runtimeEnv'
import SignatureRequestPanel from '../../components/SignatureRequestPanel'
import ChatDrawer from '../../components/ChatDrawer'
import { EmptyState } from '../shared/ui'

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

  if (!leadId) return <EmptyState message="No case selected." />

  return (
    <div className="space-y-4">
      <Link
        to="/attorney-dashboard/cases/active"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> Active cases
      </Link>

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
                  onClick={() => setChatOpen(true)}
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

          {/* Tab strip */}
          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
            {TABS.map((t) => {
              const active = t === tab
              const TabIcon = TAB_META[t].icon
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => navigate(`/attorney-dashboard/cases/${leadId}/${TAB_TO_SECTION[t]}`)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <TabIcon className="h-4 w-4" />
                  {t}
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
              <WorkstreamPanel tab={tab} section={section} lead={lead} detail={detail} cc={cc} tasks={tasks} />
            </div>
          </section>

          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            The case workspace holds all privileged work product for this retained matter. A declined or expired
            marketplace match never reaches this surface.
          </p>

          <ChatDrawer
            open={chatOpen}
            onClose={() => setChatOpen(false)}
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
}: {
  tab: Tab
  section?: string
  lead: any
  detail: CaseDetailVM
  cc: CaseCommandCenter | null
  tasks: TaskRow[]
}) {
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
    const tm = cc?.treatmentMonitor
    const bench = cc?.medicalCostBenchmark
    if (!tm || tm.chronologyCount === 0) {
      return <Note>{tm?.recommendedAction || 'Medical records pending. Provider treatment and billing appear here as records arrive.'}</Note>
    }
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Metric label="Providers" value={String(tm.providerCount)} />
          <Metric label="Treatment events" value={String(tm.chronologyCount)} />
          <Metric label="Status" value={tm.status || '—'} />
        </div>
        {tm.providers?.length ? (
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-700">Providers:</span> {tm.providers.join(', ')}
          </p>
        ) : null}
        {bench && bench.status === 'available' && bench.matchedCategories.length ? (
          <DataTable
            headers={['Treatment category', 'Typical / patient', 'High / patient']}
            align={['left', 'right', 'right']}
            rows={bench.matchedCategories.map((c) => [
              c.categoryLabel,
              money(c.medianPaidPerPatient),
              money(c.p90PaidPerPatient),
            ])}
          />
        ) : null}
        {tm.recommendedAction ? <Note>{tm.recommendedAction}</Note> : null}
      </div>
    )
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

  // Overview
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {cc?.stage?.detail || cc?.readiness?.detail || 'Retained case in progress. Work the tabs above to advance the file.'}
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Metric label="Stage" value={detail.stage} />
        <Metric label="Next action" value={cc?.nextBestAction?.title || '—'} />
        <Metric label="Readiness" value={cc?.readiness?.label || '—'} />
      </div>
    </div>
  )
}

const UPLOAD_CATEGORIES = [
  { id: 'medical_records', label: 'Medical records' },
  { id: 'police_report', label: 'Police report' },
  { id: 'bills', label: 'Bills' },
  { id: 'photos', label: 'Photos' },
  { id: 'wage_loss', label: 'Wage loss' },
  { id: 'correspondence', label: 'Correspondence' },
  { id: 'other', label: 'Other' },
]

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

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || [])
    if (!list.length) return
    if (!assessmentId) {
      setBanner({ tone: 'err', text: 'This case is missing an assessment reference; cannot upload.' })
      return
    }
    if (list.length > 10) {
      setBanner({ tone: 'err', text: 'You can upload at most 10 files at a time.' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setUploading(true)
    setBanner(null)
    try {
      if (list.length === 1) {
        const fd = new FormData()
        fd.append('file', list[0])
        fd.append('assessmentId', assessmentId)
        fd.append('category', category)
        fd.append('description', description)
        fd.append('uploadMethod', 'file_picker')
        const up = await uploadEvidenceFile(fd)
        setDocs((prev) => [up, ...prev])
      } else {
        const fd = new FormData()
        list.forEach((f) => fd.append('files', f))
        fd.append('assessmentId', assessmentId)
        fd.append('category', category)
        fd.append('description', description)
        fd.append('subcategory', '')
        const res = await uploadMultipleEvidenceFiles(fd)
        const items = Array.isArray(res?.files) ? res.files : []
        const ok = items.filter((f: any) => f?.id && !f.error)
        if (ok.length) setDocs((prev) => [...ok, ...prev])
        const failed = items.filter((f: any) => f?.error)
        if (failed.length) setBanner({ tone: 'err', text: `Some files failed: ${failed.map((f: any) => f.error).join('; ')}` })
      }
      setDescription('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      setBanner((b) => b ?? { tone: 'ok', text: 'Document uploaded.' })
    } catch (err: any) {
      setBanner({ tone: 'err', text: err?.response?.data?.error || 'Upload failed.' })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this document?')) return
    try {
      await deleteEvidenceFile(id)
      setDocs((prev) => prev.filter((d) => d.id !== id))
    } catch {
      setBanner({ tone: 'err', text: 'Could not delete the document.' })
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

      {/* Actions: upload + request */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-800">Add a document</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
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
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">Up to 10 files per batch. Attaches to the client's case file.</p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
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

      {/* Document list */}
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-800">Documents ({docs.length})</p>
        {docs.length === 0 ? (
          <EmptyState message="No documents on this case yet. Upload one or request from the client." />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {docs.map((doc) => {
              const isImage = (doc.mimetype || doc.mimeType || '').startsWith('image/')
              const tone = evidenceStatusTone(doc.processingStatus)
              const href = doc.fileUrl ? `${apiOrigin}${doc.fileUrl}` : null
              return (
                <li key={doc.id} className="flex items-center justify-between gap-4 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {isImage ? (
                      <ImageIcon className="h-4 w-4 shrink-0 text-brand-500" />
                    ) : (
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{doc.originalName || doc.filename || 'Document'}</p>
                      <p className="truncate text-xs text-slate-400">
                        {(doc.category || 'file').replace(/_/g, ' ')}
                        {doc.size ? ` · ${formatSize(doc.size)}` : ''}
                        {doc.createdAt ? ` · ${formatDate(doc.createdAt)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[tone]}`}>
                      {evidenceStatusLabel(doc.processingStatus)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDownload(doc)}
                      disabled={downloadingId === doc.id}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-brand-600 disabled:opacity-50"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-1.5 text-slate-400 hover:text-brand-600"
                        title="Open in new tab"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
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
