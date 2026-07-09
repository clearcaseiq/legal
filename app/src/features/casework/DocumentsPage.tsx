import { useEffect, useMemo, useState } from 'react'
import { getAttorneyDocumentRequests, type AttorneyDocumentRequest } from '../../lib/api'
import { Badge, ClientLink, DataTable, FilterStat, PageHeader, SectionCard, StatGrid, type BadgeTone, type DataTableColumn } from '../shared/ui'

type DocBucket = 'pending' | 'in_progress' | 'completed'
type DocFilter = 'all' | DocBucket

const FILTER_LABEL: Record<DocFilter, string> = {
  all: 'All requests',
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
}

function bucketOf(status: string): DocBucket | 'other' {
  const s = (status || '').toLowerCase()
  if (s.includes('complete') || s.includes('uploaded') || s.includes('received') || s.includes('signed')) return 'completed'
  if (s.includes('progress') || s.includes('sent') || s.includes('await')) return 'in_progress'
  if (s.includes('pending') || s.includes('new') || s.includes('open')) return 'pending'
  return 'other'
}

const STATUS_TONE: Record<DocBucket | 'other', BadgeTone> = {
  completed: 'success',
  in_progress: 'blue',
  pending: 'warning',
  other: 'neutral',
}

const docColumns: DataTableColumn<AttorneyDocumentRequest>[] = [
  {
    key: 'docs',
    header: 'Requested docs',
    cell: (r) => (
      <span className="font-medium text-slate-800">
        {(r.requestedDocs || []).map((d) => d.replace(/_/g, ' ')).join(', ') || '—'}
      </span>
    ),
  },
  { key: 'case', header: 'Case', cell: (r) => <ClientLink name={r.claimType || 'Case'} leadId={r.leadId} section="documents" /> },
  {
    key: 'recipient',
    header: 'Recipient',
    cell: (r) => <span className="text-slate-500">{r.recipientName || r.targetType || '—'}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    cell: (r) => <Badge tone={STATUS_TONE[bucketOf(r.status)]}>{(r.status || '—').replace(/_/g, ' ')}</Badge>,
  },
  {
    key: 'uploaded',
    header: 'Uploaded',
    align: 'right',
    cellClassName: 'text-slate-700',
    cell: (r) => r.uploadedCount ?? 0,
  },
]

export default function DocumentsPage() {
  const [requests, setRequests] = useState<AttorneyDocumentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<DocFilter>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAttorneyDocumentRequests()
      .then((data) => !cancelled && setRequests(Array.isArray(data) ? data : []))
      .catch((err) => !cancelled && setError(err?.response?.data?.error || err?.message || 'Failed to load documents'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(() => {
    const c = { pending: 0, in_progress: 0, completed: 0 }
    for (const r of requests) {
      const b = bucketOf(r.status)
      if (b !== 'other') c[b] += 1
    }
    return c
  }, [requests])

  const visible = useMemo(() => {
    if (filter === 'all') return requests
    return requests.filter((r) => bucketOf(r.status) === filter)
  }, [requests, filter])

  const toggle = (key: DocFilter) => setFilter((prev) => (prev === key ? 'all' : key))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Documents & E-sign"
        description="Records requests, e-signature envelopes, and client uploads across every case flow through the document portal."
      />

      <StatGrid columns={4}>
        <FilterStat value={counts.pending} label="Pending" tone="warning" active={filter === 'pending'} onClick={() => toggle('pending')} />
        <FilterStat value={counts.in_progress} label="In progress" tone="info" active={filter === 'in_progress'} onClick={() => toggle('in_progress')} />
        <FilterStat value={counts.completed} label="Completed" tone="success" active={filter === 'completed'} onClick={() => toggle('completed')} />
        <FilterStat value={requests.length} label="Total requests" active={filter === 'all'} onClick={() => setFilter('all')} />
      </StatGrid>

      <SectionCard title={FILTER_LABEL[filter]} trailing={<Badge tone="brand">{visible.length} shown</Badge>}>
        <DataTable
          columns={docColumns}
          rows={visible}
          rowKey={(r) => r.id}
          loading={loading}
          error={error}
          loadingMessage="Loading documents…"
          emptyMessage="No documents match this filter."
        />
      </SectionCard>
    </div>
  )
}
