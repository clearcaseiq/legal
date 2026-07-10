import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePlus2, PenSquare, Search } from 'lucide-react'
import {
  getAttorneyDocumentRequests,
  getAttorneyDocumentEnvelopes,
  getAttorneyDashboard,
  type AttorneyDocumentRequest,
  type AttorneyDocumentEnvelope,
} from '../../lib/api'
import LeadPickerModal from '../../components/LeadPickerModal'
import { Badge, ClientLink, DataTable, FilterStat, PageHeader, SectionCard, StatGrid, type BadgeTone, type DataTableColumn } from '../shared/ui'

type DocBucket = 'pending' | 'in_progress' | 'completed'
type DocFilter = 'all' | DocBucket
type KindFilter = 'all' | 'request' | 'esign'

const FILTER_LABEL: Record<DocFilter, string> = {
  all: 'All items',
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
}

// Cases the attorney can send docs / e-sign to (identity revealed).
const ACTIONABLE_STATUSES = new Set(['contacted', 'consulted', 'retained'])

const DOC_TYPE_LABEL: Record<string, string> = {
  retainer: 'Retainer',
  hipaa_authorization: 'HIPAA authorization',
  fee_agreement: 'Fee agreement',
  other: 'Document',
}

// Unified feed row spanning document requests and e-signature envelopes.
type FeedRow = {
  id: string
  kind: 'request' | 'esign'
  leadId: string
  title: string
  caseName: string
  recipient: string
  status: string
  createdAt: string
  detail: string
}

function bucketOf(status: string): DocBucket | 'other' {
  const s = (status || '').toLowerCase()
  if (s.includes('complete') || s.includes('uploaded') || s.includes('received') || s.includes('signed')) return 'completed'
  if (s.includes('progress') || s.includes('sent') || s.includes('await') || s.includes('view')) return 'in_progress'
  if (s.includes('pending') || s.includes('new') || s.includes('open') || s.includes('draft')) return 'pending'
  return 'other'
}

const STATUS_TONE: Record<DocBucket | 'other', BadgeTone> = {
  completed: 'success',
  in_progress: 'blue',
  pending: 'warning',
  other: 'neutral',
}

const titleCase = (s?: string | null) =>
  (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

function relTime(v?: string | null): string {
  if (!v) return '—'
  const t = new Date(v).getTime()
  if (Number.isNaN(t)) return '—'
  const diff = Date.now() - t
  const hr = 3_600_000
  const day = 86_400_000
  if (diff < hr) return `${Math.max(1, Math.floor(diff / 60_000))}m ago`
  if (diff < day) return `${Math.floor(diff / hr)}h ago`
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
  return new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function requestToRow(r: AttorneyDocumentRequest): FeedRow {
  const docs = (r.requestedDocs || []).map((d) => d.replace(/_/g, ' ')).join(', ')
  const uploaded = r.uploadedCount ?? 0
  return {
    id: `req_${r.id}`,
    kind: 'request',
    leadId: r.leadId,
    title: docs || 'Document request',
    caseName: r.clientName || titleCase(r.claimType) || 'Case',
    recipient: r.recipientName || titleCase(r.targetType) || '—',
    status: r.status || 'pending',
    createdAt: r.createdAt,
    detail: uploaded > 0 ? `${uploaded} uploaded` : '—',
  }
}

function envelopeToRow(e: AttorneyDocumentEnvelope): FeedRow {
  return {
    id: `env_${e.id}`,
    kind: 'esign',
    leadId: e.leadId,
    title: e.title || DOC_TYPE_LABEL[e.documentType] || 'E-signature',
    caseName: e.clientName || titleCase(e.claimType) || 'Case',
    recipient: e.signerName || e.signerEmail || '—',
    status: e.status || 'draft',
    createdAt: e.createdAt,
    detail: e.hasSignedFile ? 'Signed PDF' : titleCase(e.provider),
  }
}

export default function DocumentsPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<FeedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<DocFilter>('all')
  const [kind, setKind] = useState<KindFilter>('all')
  const [query, setQuery] = useState('')
  const [composeLeads, setComposeLeads] = useState<any[]>([])
  const [picker, setPicker] = useState<null | 'docs' | 'esign'>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      getAttorneyDocumentRequests().catch(() => [] as AttorneyDocumentRequest[]),
      getAttorneyDocumentEnvelopes().catch(() => [] as AttorneyDocumentEnvelope[]),
    ])
      .then(([reqs, envs]) => {
        if (cancelled) return
        const merged = [
          ...(Array.isArray(reqs) ? reqs.map(requestToRow) : []),
          ...(Array.isArray(envs) ? envs.map(envelopeToRow) : []),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setRows(merged)
      })
      .catch((err) => !cancelled && setError(err?.response?.data?.error || err?.message || 'Failed to load documents'))
      .finally(() => !cancelled && setLoading(false))
    getAttorneyDashboard()
      .then((dash: any) => {
        if (cancelled) return
        setComposeLeads(((dash?.recentLeads as any[]) || []).filter((l) => ACTIONABLE_STATUSES.has(l?.status)))
      })
      .catch(() => setComposeLeads([]))
    return () => {
      cancelled = true
    }
  }, [])

  const startFlow = (lead: any) => {
    if (!lead?.id) return
    const section = picker === 'esign' ? 'signatures' : 'evidence'
    navigate(`/attorney-dashboard/cases/${lead.id}/${section}`)
  }

  const columns: DataTableColumn<FeedRow>[] = [
    {
      key: 'type',
      header: 'Type',
      cell: (r) =>
        r.kind === 'esign' ? <Badge tone="brand">E-sign</Badge> : <Badge tone="neutral">Request</Badge>,
    },
    {
      key: 'title',
      header: 'Document',
      cell: (r) => <span className="font-medium text-slate-800">{r.title}</span>,
    },
    { key: 'case', header: 'Case', cell: (r) => <ClientLink name={r.caseName} leadId={r.leadId} section={r.kind === 'esign' ? 'signatures' : 'evidence'} /> },
    { key: 'recipient', header: 'Recipient', cell: (r) => <span className="text-slate-500">{r.recipient}</span> },
    { key: 'created', header: 'Sent', cell: (r) => <span className="text-slate-500">{relTime(r.createdAt)}</span> },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <Badge tone={STATUS_TONE[bucketOf(r.status)]}>{(r.status || '—').replace(/_/g, ' ')}</Badge>,
    },
    { key: 'detail', header: 'Detail', align: 'right', cellClassName: 'text-slate-600', cell: (r) => r.detail },
  ]

  const counts = useMemo(() => {
    const c = { pending: 0, in_progress: 0, completed: 0 }
    for (const r of rows) {
      const b = bucketOf(r.status)
      if (b !== 'other') c[b] += 1
    }
    return c
  }, [rows])

  const kindCounts = useMemo(() => {
    let request = 0
    let esign = 0
    for (const r of rows) {
      if (r.kind === 'esign') esign += 1
      else request += 1
    }
    return { request, esign, all: rows.length }
  }, [rows])

  const visible = useMemo(() => {
    let list = rows
    if (kind !== 'all') list = list.filter((r) => r.kind === kind)
    if (filter !== 'all') list = list.filter((r) => bucketOf(r.status) === filter)
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((r) =>
        [r.title, r.caseName, r.recipient, r.status].filter(Boolean).join(' ').toLowerCase().includes(q),
      )
    }
    return list
  }, [rows, kind, filter, query])

  const toggle = (key: DocFilter) => setFilter((prev) => (prev === key ? 'all' : key))

  const kindSegments: { key: KindFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: kindCounts.all },
    { key: 'request', label: 'Requests', count: kindCounts.request },
    { key: 'esign', label: 'E-sign', count: kindCounts.esign },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Documents & E-sign"
        description="Records requests, e-signature envelopes, and client uploads across every case flow through the document portal."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents…"
                className="w-52 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <button
              onClick={() => setPicker('docs')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
            >
              <FilePlus2 className="h-4 w-4 text-slate-400" />
              Request docs
            </button>
            <button
              onClick={() => setPicker('esign')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              <PenSquare className="h-4 w-4" />
              Send e-sign
            </button>
          </div>
        }
      />

      <StatGrid columns={4}>
        <FilterStat value={counts.pending} label="Pending" tone="warning" active={filter === 'pending'} onClick={() => toggle('pending')} />
        <FilterStat value={counts.in_progress} label="In progress" tone="info" active={filter === 'in_progress'} onClick={() => toggle('in_progress')} />
        <FilterStat value={counts.completed} label="Completed" tone="success" active={filter === 'completed'} onClick={() => toggle('completed')} />
        <FilterStat value={rows.length} label="Total items" active={filter === 'all'} onClick={() => setFilter('all')} />
      </StatGrid>

      <SectionCard
        title={FILTER_LABEL[filter]}
        trailing={
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {kindSegments.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setKind(s.key)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    kind === s.key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {s.label} <span className="text-slate-400">{s.count}</span>
                </button>
              ))}
            </div>
            <Badge tone="brand">{visible.length} shown</Badge>
          </div>
        }
      >
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(`/attorney-dashboard/cases/${r.leadId}/${r.kind === 'esign' ? 'signatures' : 'evidence'}`)}
          loading={loading}
          error={error}
          loadingMessage="Loading documents…"
          emptyMessage={query.trim() ? 'No documents match your search.' : 'No documents match this filter.'}
        />
      </SectionCard>

      <LeadPickerModal
        isOpen={picker !== null}
        onClose={() => setPicker(null)}
        leads={composeLeads}
        title={picker === 'esign' ? 'Send for e-signature — select a case' : 'Request documents — select a case'}
        onSelect={startFlow}
        emptyMessage="No eligible cases yet. Documents and e-signatures can be sent once a case is contacted or retained."
      />
    </div>
  )
}
