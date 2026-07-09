import { useEffect, useMemo, useState } from 'react'
import { getAttorneyTaskSummary } from '../../lib/api'
import { Badge, ClientLink, DataTable, FilterStat, PageHeader, SectionCard, StatGrid, type BadgeTone, type DataTableColumn } from '../shared/ui'

interface TaskRow {
  id: string
  title: string
  dueDate?: string | null
  status?: string | null
  priority?: string | null
  taskType?: string | null
  assessmentId?: string | null
  leadId?: string | null
  claimType?: string | null
}

interface TaskSummary {
  overdue: TaskRow[]
  today: TaskRow[]
  upcoming: TaskRow[]
  noDueDate: TaskRow[]
}

type Bucket = 'all' | 'overdue' | 'today' | 'upcoming' | 'noDueDate'

const BUCKET_LABEL: Record<Bucket, string> = {
  all: 'All open tasks',
  overdue: 'Overdue',
  today: 'Due today',
  upcoming: 'Upcoming',
  noDueDate: 'No due date',
}

function formatDue(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

function priorityBadgeTone(priority?: string | null): BadgeTone {
  const p = (priority || '').toLowerCase()
  if (p === 'high' || p === 'urgent') return 'danger'
  if (p === 'medium') return 'warning'
  return 'neutral'
}

const taskColumns: DataTableColumn<TaskRow>[] = [
  { key: 'title', header: 'Task', cell: (r) => <span className="font-medium text-slate-800">{r.title}</span> },
  { key: 'case', header: 'Case', cell: (r) => <ClientLink name={r.claimType || 'Case'} leadId={r.leadId} section="tasks" /> },
  { key: 'type', header: 'Type', cell: (r) => <span className="text-slate-500">{r.taskType || '—'}</span> },
  { key: 'due', header: 'Due', cell: (r) => <span className="text-slate-500">{formatDue(r.dueDate)}</span> },
  { key: 'priority', header: 'Priority', cell: (r) => <Badge tone={priorityBadgeTone(r.priority)}>{r.priority || 'Normal'}</Badge> },
]

export default function TasksPage() {
  const [summary, setSummary] = useState<TaskSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bucket, setBucket] = useState<Bucket>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAttorneyTaskSummary()
      .then((data) => {
        if (cancelled) return
        setSummary({
          overdue: data?.overdue ?? [],
          today: data?.today ?? [],
          upcoming: data?.upcoming ?? [],
          noDueDate: data?.noDueDate ?? [],
        })
      })
      .catch((err) => !cancelled && setError(err?.response?.data?.error || err?.message || 'Failed to load tasks'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const rows = useMemo<TaskRow[]>(() => {
    if (!summary) return []
    if (bucket === 'all') return [...summary.overdue, ...summary.today, ...summary.upcoming, ...summary.noDueDate]
    return summary[bucket]
  }, [summary, bucket])

  const toggle = (key: Bucket) => setBucket((prev) => (prev === key ? 'all' : key))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tasks"
        description="A cross-case queue that rolls up every case's task list so nothing slips. The same tasks appear on each case's Tasks tab."
      />

      <StatGrid columns={4}>
        <FilterStat
          value={summary?.overdue.length ?? 0}
          label="Overdue"
          tone="danger"
          active={bucket === 'overdue'}
          onClick={() => toggle('overdue')}
        />
        <FilterStat
          value={summary?.today.length ?? 0}
          label="Due today"
          tone="warning"
          active={bucket === 'today'}
          onClick={() => toggle('today')}
        />
        <FilterStat
          value={summary?.upcoming.length ?? 0}
          label="Upcoming"
          tone="info"
          active={bucket === 'upcoming'}
          onClick={() => toggle('upcoming')}
        />
        <FilterStat
          value={summary?.noDueDate.length ?? 0}
          label="No due date"
          active={bucket === 'noDueDate'}
          onClick={() => toggle('noDueDate')}
        />
      </StatGrid>

      <SectionCard title={BUCKET_LABEL[bucket]} trailing={<Badge tone="brand">{rows.length} shown</Badge>}>
        <DataTable
          columns={taskColumns}
          rows={rows}
          rowKey={(r) => r.id}
          loading={loading}
          error={error}
          loadingMessage="Loading tasks…"
          emptyMessage="No tasks match this filter."
        />
      </SectionCard>
    </div>
  )
}
