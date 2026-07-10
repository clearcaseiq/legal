import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { getAttorneyDashboard } from '../../lib/api'
import { Avatar, Badge, ClientLink, DataTable, FilterBar, FilterStat, PageHeader, SectionCard, StatGrid, type BadgeTone, type DataTableColumn, type FilterField } from '../shared/ui'

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

const ACCEPTED_STATUSES = ['contacted', 'consulted', 'retained']

// A retained case works toward a demand; an accepted (contacted) case works toward
// a scheduled consult; a consulted case works toward a signed retainer. These SLA
// offsets turn a case's last-updated date into a concrete "next action" due date.
const STAGE: Record<string, { label: string; tone: StageTone; nextAction: string; slaDays: number }> = {
  contacted: { label: 'Contacted', tone: 'info', nextAction: 'Schedule consult', slaDays: 2 },
  consulted: { label: 'Consult scheduled', tone: 'warning', nextAction: 'Send retainer', slaDays: 3 },
  retained: { label: 'Retained', tone: 'success', nextAction: 'Prepare demand', slaDays: 14 },
}

type StageTone = 'info' | 'warning' | 'success'
type DueKey = 'overdue' | 'today' | 'tomorrow' | 'upcoming'
type CaseView = 'all' | 'consults' | 'tasks' | 'demands'

interface CaseRow {
  id: string
  leadId: string
  client: string
  claimType: string
  typeLabel: string
  stageKey: string
  stageLabel: string
  stageTone: StageTone
  jurisdiction: string
  valueLow: number
  valueHigh: number
  valueLabel: string
  nextAction: string
  actionType: string
  actionHref: string
  actionHint: string
  actionTone: ActionTone
  dueKey: DueKey
  dueLabel: string
  consultToday: boolean
  overdueTaskCount: number
  dueTodayTaskCount: number
  isDemandReady: boolean
  readinessLabel: string
  readinessScore: number
  evidenceCount: number
  evidenceCategories: string[]
}

const VIEW_LABELS: Record<CaseView, string> = {
  all: 'My active cases',
  consults: 'Consults today',
  tasks: 'Tasks due',
  demands: 'Demands to send',
}

const STAGE_BADGE: Record<StageTone, BadgeTone> = {
  info: 'brand',
  warning: 'warning',
  success: 'success',
}

const DUE_BADGE_TONE: Record<DueKey, BadgeTone> = {
  overdue: 'danger',
  today: 'warning',
  tomorrow: 'neutral',
  upcoming: 'neutral',
}

function compactMoney(n: number) {
  if (!Number.isFinite(n) || n <= 0) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 2).replace(/\.00$/, '')}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${Math.round(n)}`
}

function readBands(lead: any): { low: number; high: number } {
  // Match the pre-acceptance snapshot: use the LATEST prediction (A3-09).
  const preds = lead?.assessment?.predictions
  const pred = Array.isArray(preds)
    ? [...preds].sort((a, b) => new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime()).pop()
    : preds || {}
  let bands: any = {}
  if (pred?.bands) {
    try {
      bands = typeof pred.bands === 'string' ? JSON.parse(pred.bands) : pred.bands
    } catch {
      bands = {}
    }
  }
  return {
    low: Number(bands.low ?? bands.p25 ?? 0) || 0,
    high: Number(bands.high ?? bands.p75 ?? bands.median ?? 0) || 0,
  }
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function classifyDue(due: Date): { key: DueKey; label: string } {
  const today = startOfDay(new Date())
  const target = startOfDay(due)
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  if (diffDays < 0) return { key: 'overdue', label: diffDays === -1 ? 'Overdue 1d' : `Overdue ${Math.abs(diffDays)}d` }
  if (diffDays === 0) return { key: 'today', label: 'Today' }
  if (diffDays === 1) return { key: 'tomorrow', label: 'Tomorrow' }
  return { key: 'upcoming', label: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }
}

// ---- Smart next action (server-derived) ------------------------------------
// The API attaches a context-aware `demandReadiness.nextAction` to every lead
// (see api/src/lib/attorney-work-queue.ts): it looks at overdue tasks, whether a
// consult is booked, missing evidence, awaiting plaintiff replies, demand
// readiness, and negotiation aging. We surface that here and fall back to the
// stage heuristic only when readiness is absent.
type ActionType =
  | 'review_task'
  | 'schedule_consult'
  | 'request_documents'
  | 'send_message'
  | 'open_demand'
  | 'open_negotiation'
  | 'open_lead'

type ActionTone = 'rose' | 'amber' | 'brand' | 'slate'

const ACTION_META: Record<ActionType, { label: string; tone: ActionTone }> = {
  review_task: { label: 'Clear tasks', tone: 'rose' },
  schedule_consult: { label: 'Schedule consult', tone: 'amber' },
  request_documents: { label: 'Request documents', tone: 'amber' },
  send_message: { label: 'Message plaintiff', tone: 'amber' },
  open_demand: { label: 'Prepare demand', tone: 'brand' },
  open_negotiation: { label: 'Review negotiation', tone: 'brand' },
  open_lead: { label: 'Review case', tone: 'slate' },
}

const ACTION_DOT: Record<ActionTone, string> = {
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  brand: 'bg-brand-500',
  slate: 'bg-slate-300',
}

// Legend for the "Next action" urgency dot, grouped by what the color means.
const ACTION_LEGEND: { tone: ActionTone; label: string }[] = [
  { tone: 'rose', label: 'Overdue / blocked' },
  { tone: 'amber', label: 'Needs outreach' },
  { tone: 'brand', label: 'Ready to advance' },
  { tone: 'slate', label: 'Routine review' },
]

function ActionLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Next action color key">
      {ACTION_LEGEND.map((item) => (
        <span key={item.tone} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <span className={`h-1.5 w-1.5 rounded-full ${ACTION_DOT[item.tone]}`} aria-hidden />
          {item.label}
        </span>
      ))}
    </div>
  )
}

const DOC_SHORT: Record<string, string> = {
  medical_records: 'medical records',
  bills: 'bills',
  police_report: 'police report',
  injury_photos: 'injury photos',
}

function docShortLabel(keys: string[]): string {
  const labels = keys.map((k) => DOC_SHORT[k] || k.replace(/_/g, ' '))
  if (labels.length <= 1) return labels[0] || 'documents'
  return `${labels[0]} +${labels.length - 1}`
}

// Deep-link the action to where the work happens. "Schedule consult" opens the
// dedicated scheduling flow; everything else opens the relevant workspace tab
// named by the readiness engine's `targetSection`.
function actionHrefFor(leadId: string, actionType: string, targetSection?: string, consultToday?: boolean): string {
  if (consultToday) return `/attorney-dashboard/lead/${leadId}/timeline`
  if (actionType === 'schedule_consult')
    return `/attorney-dashboard/schedule-consult/${leadId}?returnTo=${encodeURIComponent('/attorney-dashboard/cases/active')}`
  return `/attorney-dashboard/lead/${leadId}/${targetSection || 'overview'}`
}

export default function ActiveCasesPage() {
  const [searchParams] = useSearchParams()
  const [leads, setLeads] = useState<any[]>([])
  const [consults, setConsults] = useState<any[]>([])
  const [retainedValue, setRetainedValue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [view, setView] = useState<CaseView>('all')
  const [filters, setFilters] = useState<Record<string, string>>(() => ({
    type: searchParams.get('caseType') || '',
    stage: searchParams.get('stage') === 'retained' ? 'retained' : '',
    value: '',
    evidence: '',
  }))

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAttorneyDashboard()
      .then((data: any) => {
        if (cancelled) return
        setLeads(Array.isArray(data?.recentLeads) ? data.recentLeads : [])
        setConsults(Array.isArray(data?.upcomingConsults) ? data.upcomingConsults : [])
        setRetainedValue(Number(data?.retainedValue ?? 0) || 0)
      })
      .catch((err: any) => !cancelled && setError(err?.response?.data?.error || err?.message || 'Failed to load cases'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  // Which of my cases has a consult scheduled for today (from the calendar feed).
  const consultTodayLeadIds = useMemo(() => {
    const today = startOfDay(new Date()).getTime()
    const ids = new Set<string>()
    for (const c of consults) {
      const when = Date.parse(c?.scheduledAt || '')
      if (!Number.isNaN(when) && startOfDay(new Date(when)).getTime() === today && c?.leadId) {
        ids.add(c.leadId)
      }
    }
    return ids
  }, [consults])

  // Every accepted case, projected into the row shape the table + tiles use.
  const rows = useMemo<CaseRow[]>(() => {
    return leads
      .filter((lead) => ACCEPTED_STATUSES.includes(lead?.status || ''))
      .map((lead) => {
        const stage = STAGE[lead.status as keyof typeof STAGE] ?? STAGE.contacted
        const consultToday = consultTodayLeadIds.has(lead.id)
        const reference = new Date(lead?.lastContactAt || lead?.updatedAt || lead?.submittedAt || Date.now())
        const due = new Date(reference)
        due.setDate(due.getDate() + stage.slaDays)
        const { low, high } = readBands(lead)
        const user = lead?.assessment?.user
        const client = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Client'
        const evidenceFiles = Array.isArray(lead?.assessment?.evidenceFiles) ? lead.assessment.evidenceFiles : []
        const evidenceCategories = Array.from(
          new Set(evidenceFiles.map((f: any) => String(f?.category || '')).filter(Boolean)),
        ) as string[]

        // Prefer the server-derived readiness action; fall back to the stage heuristic.
        const readiness = lead?.demandReadiness
        const ra = readiness?.nextAction
        const overdueTaskCount = Number(readiness?.overdueTaskCount ?? 0) || 0
        const dueTodayTaskCount = Number(readiness?.dueTodayTaskCount ?? 0) || 0

        let actionType: string
        let nextAction: string
        let actionHref: string
        let actionHint: string
        let actionTone: ActionTone
        if (consultToday) {
          actionType = 'schedule_consult'
          nextAction = 'Consultation today'
          actionHref = `/attorney-dashboard/lead/${lead.id}/timeline`
          actionHint = 'A consultation is booked for today — open the case to prep or review.'
          actionTone = 'amber'
        } else if (ra) {
          actionType = String(ra.actionType || 'open_lead')
          const meta = ACTION_META[actionType as ActionType]
          nextAction = meta?.label ?? 'Review case'
          if (actionType === 'request_documents' && Array.isArray(ra.requestedDocs) && ra.requestedDocs.length) {
            nextAction = `Request ${docShortLabel(ra.requestedDocs)}`
          }
          actionHref = actionHrefFor(lead.id, actionType, ra.targetSection, false)
          actionHint = [ra.title, ra.detail].filter(Boolean).join(' — ') || 'Suggested next step for this file.'
          actionTone = overdueTaskCount > 0 ? 'rose' : meta?.tone ?? 'slate'
        } else {
          // No readiness payload (older API) → stage heuristic.
          const label = stage.nextAction
          actionType = label.toLowerCase().includes('consult')
            ? 'schedule_consult'
            : label.toLowerCase().includes('demand')
              ? 'open_demand'
              : 'open_lead'
          nextAction = label
          actionHref = nextActionHref(lead.id, label)
          actionHint = 'Suggested next step based on case stage.'
          actionTone = 'slate'
        }

        // Due date is task-driven when the readiness engine is tracking work,
        // otherwise it falls back to the stage SLA projection.
        let dueInfo: { key: DueKey; label: string }
        if (consultToday) dueInfo = { key: 'today', label: 'Today' }
        else if (overdueTaskCount > 0)
          dueInfo = { key: 'overdue', label: overdueTaskCount === 1 ? '1 task overdue' : `${overdueTaskCount} overdue` }
        else if (dueTodayTaskCount > 0) dueInfo = { key: 'today', label: 'Task due today' }
        else dueInfo = classifyDue(due)

        return {
          id: lead.id,
          leadId: lead.id,
          client,
          claimType: lead?.assessment?.claimType || '',
          typeLabel: claimLabel(lead?.assessment?.claimType),
          stageKey: lead.status,
          stageLabel: stage.label,
          stageTone: stage.tone,
          jurisdiction: lead?.assessment?.venueState || '',
          valueLow: low,
          valueHigh: high,
          valueLabel: low && high ? `${compactMoney(low)}–${compactMoney(high)}` : compactMoney(high || low),
          nextAction,
          actionType,
          actionHref,
          actionHint,
          actionTone,
          dueKey: dueInfo.key,
          dueLabel: dueInfo.label,
          consultToday,
          overdueTaskCount,
          dueTodayTaskCount,
          isDemandReady: Boolean(readiness?.isDemandReady),
          readinessLabel: String(readiness?.label || ''),
          readinessScore: Number(readiness?.score ?? 0) || 0,
          evidenceCount: evidenceFiles.length,
          evidenceCategories,
        }
      })
  }, [leads, consultTodayLeadIds])

  const isTaskDue = (r: CaseRow) =>
    r.overdueTaskCount > 0 || r.dueTodayTaskCount > 0 || r.dueKey === 'today' || r.dueKey === 'tomorrow' || r.dueKey === 'overdue'
  const isDemandFocus = (r: CaseRow) => r.actionType === 'open_demand' || r.isDemandReady

  const passesView = (r: CaseRow) => {
    if (view === 'consults') return r.consultToday || r.actionType === 'schedule_consult' || r.stageKey === 'consulted'
    if (view === 'tasks') return isTaskDue(r)
    if (view === 'demands') return isDemandFocus(r)
    return true
  }

  const passesFilters = (r: CaseRow) => {
    if (filters.type && r.claimType !== filters.type) return false
    if (filters.stage && r.stageKey !== filters.stage) return false
    if (filters.value === 'low' && r.valueHigh >= 10_000) return false
    if (filters.value === 'mid' && (r.valueHigh < 10_000 || r.valueHigh >= 50_000)) return false
    if (filters.value === 'high' && r.valueHigh < 50_000) return false
    if (filters.evidence === 'has' && r.evidenceCount === 0) return false
    else if (filters.evidence === 'none' && r.evidenceCount > 0) return false
    else if (filters.evidence && !['has', 'none'].includes(filters.evidence) && !r.evidenceCategories.includes(filters.evidence)) return false
    return true
  }

  const visible = rows.filter((r) => passesView(r) && passesFilters(r))

  // Tile counts derive from the full accepted set so they stay stable while the
  // dropdown filters narrow the table below.
  const counts = useMemo(
    () => ({
      all: rows.length,
      consults: rows.filter((r) => r.consultToday || r.actionType === 'schedule_consult' || r.stageKey === 'consulted').length,
      tasks: rows.filter((r) => isTaskDue(r)).length,
      demands: rows.filter((r) => isDemandFocus(r)).length,
    }),
    [rows],
  )

  const filterFields: FilterField[] = useMemo(() => {
    const types = Array.from(new Set(rows.map((r) => r.claimType).filter(Boolean)))
    return [
      {
        key: 'type',
        label: 'Type',
        options: [{ value: '', label: 'All types' }, ...types.map((t) => ({ value: t, label: claimLabel(t) }))],
      },
      {
        key: 'stage',
        label: 'Stage',
        options: [
          { value: '', label: 'All stages' },
          { value: 'contacted', label: 'Contacted' },
          { value: 'consulted', label: 'Consult scheduled' },
          { value: 'retained', label: 'Retained' },
        ],
      },
      {
        key: 'value',
        label: 'Value',
        options: [
          { value: '', label: 'Any value' },
          { value: 'low', label: 'Under $10k' },
          { value: 'mid', label: '$10k–$50k' },
          { value: 'high', label: 'Over $50k' },
        ],
      },
      {
        key: 'evidence',
        label: 'Evidence',
        options: [
          { value: '', label: 'All evidence' },
          { value: 'has', label: 'Has evidence' },
          { value: 'none', label: 'Missing evidence' },
          { value: 'photos', label: 'Photos' },
          { value: 'bills', label: 'Medical bills' },
          { value: 'medical_records', label: 'Medical records' },
          { value: 'police_report', label: 'Police / incident report' },
        ],
      },
    ]
  }, [rows])

  const toggleView = (next: CaseView) => setView((prev) => (prev === next ? 'all' : next))

  return (
    <div className="space-y-4">
      <PageHeader title="Active Cases" />

      <StatGrid columns={5}>
        <FilterStat
          value={counts.all}
          label="Active cases"
          tone="neutral"
          filled
          active={view === 'all'}
          onClick={() => setView('all')}
        />
        <FilterStat
          value={counts.consults}
          label="Consults today"
          tone="blue"
          filled
          active={view === 'consults'}
          onClick={() => toggleView('consults')}
        />
        <FilterStat
          value={counts.tasks}
          label="Tasks due"
          tone="warning"
          filled
          active={view === 'tasks'}
          onClick={() => toggleView('tasks')}
        />
        <FilterStat
          value={counts.demands}
          label="Demands to send"
          tone="danger"
          filled
          active={view === 'demands'}
          onClick={() => toggleView('demands')}
        />
        <FilterStat value={compactMoney(retainedValue)} label="Retained value" tone="success" filled />
      </StatGrid>

      <FilterBar
        fields={filterFields}
        values={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onReset={() => setFilters({ type: '', stage: '', value: '', evidence: '' })}
      />

      <SectionCard
        title={VIEW_LABELS[view]}
        trailing={
          <div className="flex items-center gap-4">
            <div className="hidden lg:block">
              <ActionLegend />
            </div>
            <Badge tone="brand">{visible.length} shown</Badge>
          </div>
        }
      >
        <div className="mb-3 border-b border-slate-100 pb-3 lg:hidden">
          <ActionLegend />
        </div>
        <DataTable
          columns={caseColumns}
          rows={visible}
          rowKey={(r) => r.id}
          loading={loading}
          error={error}
          loadingMessage="Loading cases…"
          emptyMessage="No cases match these filters."
        />
      </SectionCard>
    </div>
  )
}

// The stage badge is a plain status label; the next action deep-links to where
// that work actually happens. "Schedule consult" opens the dedicated
// consult-scheduling flow for the case (not a passive workspace tab); the rest
// deep-link to the relevant Case Workspace tab.
function nextActionHref(leadId: string, nextAction: string): string {
  const a = nextAction.toLowerCase()
  // A consult already booked for today → open the case Timeline (nothing to
  // schedule). Only the "Schedule consult" prompt opens the scheduling flow.
  if (a.includes('consultation today')) return `/attorney-dashboard/lead/${leadId}/timeline`
  if (a.includes('consult'))
    return `/attorney-dashboard/schedule-consult/${leadId}?returnTo=${encodeURIComponent('/attorney-dashboard/cases/active')}`
  if (a.includes('demand')) return `/attorney-dashboard/lead/${leadId}/demand`
  if (a.includes('retainer')) return `/attorney-dashboard/lead/${leadId}/documents`
  return `/attorney-dashboard/lead/${leadId}/tasks`
}

const caseColumns: DataTableColumn<CaseRow>[] = [
  {
    key: 'client',
    header: 'Client',
    cell: (r) => (
      <div className="flex items-center gap-3">
        <Avatar name={r.client} />
        <ClientLink name={r.client} leadId={r.leadId} section="overview" />
      </div>
    ),
  },
  { key: 'type', header: 'Type', cell: (r) => <span className="text-slate-500">{r.typeLabel}</span> },
  {
    key: 'stage',
    header: 'Stage',
    cell: (r) => <Badge tone={STAGE_BADGE[r.stageTone]}>{r.stageLabel}</Badge>,
  },
  {
    key: 'next',
    header: 'Next action',
    cell: (r) => (
      <Link
        to={r.actionHref}
        title={r.actionHint}
        className="group/action inline-flex items-center gap-1.5 font-medium text-brand-700 underline decoration-brand-300 decoration-dashed underline-offset-4 transition hover:text-brand-800 hover:decoration-brand-500 hover:decoration-solid"
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ACTION_DOT[r.actionTone]}`} aria-hidden />
        {r.nextAction}
        <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover/action:translate-x-0.5" />
      </Link>
    ),
  },
  { key: 'due', header: 'Due', cell: (r) => <Badge tone={DUE_BADGE_TONE[r.dueKey]}>{r.dueLabel}</Badge> },
  {
    key: 'value',
    header: 'Value',
    align: 'right',
    cellClassName: 'tabular-nums font-semibold text-slate-900',
    cell: (r) => r.valueLabel,
  },
]
