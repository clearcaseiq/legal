import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { getAttorneyDeadlines, type AttorneyDeadlineItem } from '../../lib/api'
import {
  Badge,
  ClientLink,
  DataTable,
  FilterStat,
  PageHeader,
  SectionCard,
  StatGrid,
  type BadgeTone,
  type DataTableColumn,
} from '../shared/ui'

type Bucket = 'all' | 'expired' | 'critical' | 'warning' | 'sol' | 'task'

const claimLabel = (s?: string | null) =>
  (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Case'

const SEVERITY_DOT: Record<AttorneyDeadlineItem['severity'], string> = {
  expired: 'bg-rose-600',
  critical: 'bg-rose-500',
  warning: 'bg-amber-500',
  safe: 'bg-emerald-500',
}

function SeverityDot({ severity }: { severity: AttorneyDeadlineItem['severity'] }) {
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${SEVERITY_DOT[severity]}`} aria-hidden />
}

function Legend() {
  const items: { severity: AttorneyDeadlineItem['severity']; label: string }[] = [
    { severity: 'expired', label: 'Expired' },
    { severity: 'critical', label: 'Critical ≤90d' },
    { severity: 'warning', label: 'Warning ≤1yr' },
    { severity: 'safe', label: 'On track' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
      {items.map((it) => (
        <span key={it.severity} className="inline-flex items-center gap-1.5">
          <SeverityDot severity={it.severity} />
          {it.label}
        </span>
      ))}
    </div>
  )
}

function formatDate(value: string) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function countdown(days: number) {
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, cls: 'font-semibold text-rose-600' }
  if (days === 0) return { text: 'Due today', cls: 'font-semibold text-rose-600' }
  if (days <= 90) return { text: `${days}d left`, cls: 'font-medium text-amber-600' }
  if (days <= 365) return { text: `${days}d left`, cls: 'text-slate-600' }
  const yrs = (days / 365).toFixed(1)
  return { text: `${yrs}y left`, cls: 'text-slate-500' }
}

function kindBadge(item: AttorneyDeadlineItem): { tone: BadgeTone; label: string } {
  if (item.kind === 'sol') return { tone: 'brand', label: 'Statute' }
  return { tone: 'neutral', label: 'Task' }
}

export default function DeadlinesPage() {
  const [items, setItems] = useState<AttorneyDeadlineItem[]>([])
  const [caseCount, setCaseCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bucket, setBucket] = useState<Bucket>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAttorneyDeadlines()
      .then((data) => {
        if (cancelled) return
        setItems(data?.items ?? [])
        setCaseCount(data?.caseCount ?? 0)
      })
      .catch((err) => !cancelled && setError(err?.response?.data?.error || err?.message || 'Failed to load deadlines'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(() => {
    return {
      expired: items.filter((i) => i.severity === 'expired').length,
      critical: items.filter((i) => i.severity === 'critical').length,
      warning: items.filter((i) => i.severity === 'warning').length,
      sol: items.filter((i) => i.kind === 'sol').length,
      task: items.filter((i) => i.kind === 'task').length,
    }
  }, [items])

  const rows = useMemo(() => {
    switch (bucket) {
      case 'expired':
        return items.filter((i) => i.severity === 'expired')
      case 'critical':
        return items.filter((i) => i.severity === 'critical')
      case 'warning':
        return items.filter((i) => i.severity === 'warning')
      case 'sol':
        return items.filter((i) => i.kind === 'sol')
      case 'task':
        return items.filter((i) => i.kind === 'task')
      default:
        return items
    }
  }, [items, bucket])

  const toggle = (key: Bucket) => setBucket((prev) => (prev === key ? 'all' : key))

  const atRisk = counts.expired + counts.critical

  const columns: DataTableColumn<AttorneyDeadlineItem>[] = [
    {
      key: 'deadline',
      header: 'Deadline',
      cell: (r) => {
        const kb = kindBadge(r)
        return (
          <div className="flex items-center gap-2.5">
            <SeverityDot severity={r.severity} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">{r.title}</span>
                <Badge tone={kb.tone}>{kb.label}</Badge>
              </div>
              {r.note ? <p className="mt-0.5 truncate text-xs text-slate-400">{r.note}</p> : null}
            </div>
          </div>
        )
      },
    },
    {
      key: 'case',
      header: 'Case',
      cell: (r) => <ClientLink name={r.clientName} leadId={r.leadId} section="deadlines" />,
    },
    { key: 'claim', header: 'Type', cell: (r) => <span className="text-slate-500">{claimLabel(r.claimType)}</span> },
    { key: 'due', header: 'Due date', cell: (r) => <span className="tabular-nums text-slate-600">{formatDate(r.dueDate)}</span> },
    {
      key: 'countdown',
      header: 'Countdown',
      align: 'right',
      cell: (r) => {
        const c = countdown(r.daysRemaining)
        return <span className={`tabular-nums ${c.cls}`}>{c.text}</span>
      },
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Deadlines"
        description="A portfolio-wide filing-clock radar. Statute-of-limitations dates are computed live per case from the incident date, venue, and claim type, alongside every open, dated deadline task — so nothing slips across your caseload."
      />

      {!loading && !error && atRisk > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          <p>
            <span className="font-semibold">{atRisk}</span> deadline{atRisk === 1 ? '' : 's'} need attention —{' '}
            {counts.expired > 0 ? `${counts.expired} expired` : null}
            {counts.expired > 0 && counts.critical > 0 ? ' and ' : null}
            {counts.critical > 0 ? `${counts.critical} within 90 days` : null}. Review these first.
          </p>
        </div>
      ) : null}

      <StatGrid columns={5}>
        <FilterStat value={counts.expired} label="Expired" tone="danger" active={bucket === 'expired'} onClick={() => toggle('expired')} />
        <FilterStat value={counts.critical} label="Critical (≤90d)" tone="danger" active={bucket === 'critical'} onClick={() => toggle('critical')} />
        <FilterStat value={counts.warning} label="Warning (≤1yr)" tone="warning" active={bucket === 'warning'} onClick={() => toggle('warning')} />
        <FilterStat value={counts.sol} label="Statute clocks" tone="info" active={bucket === 'sol'} onClick={() => toggle('sol')} />
        <FilterStat value={counts.task} label="Deadline tasks" active={bucket === 'task'} onClick={() => toggle('task')} />
      </StatGrid>

      <SectionCard
        title={`Deadlines across ${caseCount} case${caseCount === 1 ? '' : 's'}`}
        trailing={<Legend />}
      >
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          loading={loading}
          error={error}
          loadingMessage="Loading deadlines…"
          emptyMessage={
            bucket === 'all'
              ? 'No deadlines yet. Statute clocks appear once cases have an incident date, venue, and claim type.'
              : 'No deadlines match this filter.'
          }
        />
      </SectionCard>
    </div>
  )
}
