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
  dueKey: DueKey
  dueLabel: string
  consultToday: boolean
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
        const dueInfo = consultToday ? { key: 'today' as DueKey, label: 'Today' } : classifyDue(due)
        const { low, high } = readBands(lead)
        const user = lead?.assessment?.user
        const client = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Client'
        const evidenceFiles = Array.isArray(lead?.assessment?.evidenceFiles) ? lead.assessment.evidenceFiles : []
        const evidenceCategories = Array.from(
          new Set(evidenceFiles.map((f: any) => String(f?.category || '')).filter(Boolean)),
        ) as string[]
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
          nextAction: consultToday ? 'Consultation today' : stage.nextAction,
          dueKey: dueInfo.key,
          dueLabel: dueInfo.label,
          consultToday,
          evidenceCount: evidenceFiles.length,
          evidenceCategories,
        }
      })
  }, [leads, consultTodayLeadIds])

  const passesView = (r: CaseRow) => {
    if (view === 'consults') return r.consultToday || r.stageKey === 'consulted'
    if (view === 'tasks') return r.dueKey === 'today' || r.dueKey === 'tomorrow' || r.dueKey === 'overdue'
    if (view === 'demands') return r.nextAction.toLowerCase().includes('demand')
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
      consults: rows.filter((r) => r.consultToday || r.stageKey === 'consulted').length,
      tasks: rows.filter((r) => r.dueKey === 'today' || r.dueKey === 'tomorrow' || r.dueKey === 'overdue').length,
      demands: rows.filter((r) => r.nextAction.toLowerCase().includes('demand')).length,
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
        trailing={<Badge tone="brand">{visible.length} shown</Badge>}
      >
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
        to={nextActionHref(r.leadId, r.nextAction)}
        title="Go to where this action happens"
        className="group/action inline-flex items-center gap-1 font-medium text-brand-700 underline decoration-brand-300 decoration-dashed underline-offset-4 transition hover:text-brand-800 hover:decoration-brand-500 hover:decoration-solid"
      >
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
