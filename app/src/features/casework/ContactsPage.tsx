import { useEffect, useMemo, useState } from 'react'
import { Search, Mail, Phone } from 'lucide-react'
import { getAllCaseContacts, getFirmCaseContacts } from '../../lib/api'
import { useAttorneyWorkspace } from '../shared/AttorneyWorkspaceContext'
import { Avatar, Badge, ClientLink, DataTable, FilterStat, PageHeader, SectionCard, StatGrid, type BadgeTone, type DataTableColumn } from '../shared/ui'

interface CaseContactRow {
  id: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  companyName?: string | null
  title?: string | null
  contactType?: string | null
  source?: string | null
  lead?: { id?: string | null; assessment?: { claimType?: string | null } | null } | null
}

type ContactCategory = 'client' | 'adjuster' | 'provider' | 'expert'
type ContactFilter = 'all' | ContactCategory

const FILTER_LABEL: Record<ContactFilter, string> = {
  all: 'All contacts',
  client: 'Clients',
  adjuster: 'Adjusters',
  provider: 'Providers',
  expert: 'Experts',
}

const CATEGORY_TONE: Record<ContactCategory | 'other', BadgeTone> = {
  client: 'blue',
  adjuster: 'warning',
  provider: 'brand',
  expert: 'success',
  other: 'neutral',
}

function categoryOf(type?: string | null): ContactCategory | 'other' {
  const t = (type || '').toLowerCase()
  if (t.includes('client') || t.includes('plaintiff')) return 'client'
  if (t.includes('adjuster') || t.includes('insurance')) return 'adjuster'
  if (t.includes('provider') || t.includes('medical') || t.includes('doctor')) return 'provider'
  if (t.includes('expert') || t.includes('witness')) return 'expert'
  return 'other'
}

function contactName(c: CaseContactRow) {
  return `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || '—'
}

const titleCase = (s?: string | null) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())

const contactColumns: DataTableColumn<CaseContactRow>[] = [
  {
    key: 'name',
    header: 'Name',
    cell: (c) => (
      <div className="flex items-center gap-3">
        <Avatar name={contactName(c)} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-800">{contactName(c)}</span>
            {c.source === 'derived' && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                auto
              </span>
            )}
          </div>
          {c.title && <div className="truncate text-xs text-slate-400">{c.title}</div>}
        </div>
      </div>
    ),
  },
  {
    key: 'type',
    header: 'Type',
    cell: (c) => {
      const cat = categoryOf(c.contactType)
      return <Badge tone={CATEGORY_TONE[cat]}>{titleCase(c.contactType) || '—'}</Badge>
    },
  },
  { key: 'company', header: 'Company', cell: (c) => <span className="text-slate-500">{c.companyName || '—'}</span> },
  {
    key: 'email',
    header: 'Email',
    cell: (c) =>
      c.email ? (
        <a
          href={`mailto:${c.email}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700 hover:underline"
        >
          <Mail className="h-3.5 w-3.5 text-slate-400" />
          {c.email}
        </a>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
  {
    key: 'phone',
    header: 'Phone',
    cell: (c) =>
      c.phone ? (
        <a
          href={`tel:${c.phone}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 text-slate-600 hover:text-brand-700 hover:underline"
        >
          <Phone className="h-3.5 w-3.5 text-slate-400" />
          {c.phone}
        </a>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
  {
    key: 'case',
    header: 'Case',
    cell: (c) => <ClientLink name={titleCase(c.lead?.assessment?.claimType) || 'Case'} leadId={c.lead?.id} section="contacts" />,
  },
]

export default function ContactsPage() {
  const { isFirmAdmin } = useAttorneyWorkspace()
  const [scope, setScope] = useState<'mine' | 'firm'>('mine')
  const [contacts, setContacts] = useState<CaseContactRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ContactFilter>('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const loader = scope === 'firm' && isFirmAdmin ? getFirmCaseContacts() : getAllCaseContacts()
    loader
      .then((data: CaseContactRow[]) => !cancelled && setContacts(Array.isArray(data) ? data : []))
      .catch((err) => !cancelled && setError(err?.response?.data?.error || err?.message || 'Failed to load contacts'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [scope, isFirmAdmin])

  const counts = useMemo(() => {
    const c = { client: 0, adjuster: 0, provider: 0, expert: 0 }
    for (const contact of contacts) {
      const cat = categoryOf(contact.contactType)
      if (cat !== 'other') c[cat] += 1
    }
    return c
  }, [contacts])

  const visible = useMemo(() => {
    let list = contacts
    if (filter !== 'all') list = list.filter((c) => categoryOf(c.contactType) === filter)
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((c) =>
        [contactName(c), c.companyName, c.email, c.phone, c.contactType, c.lead?.assessment?.claimType]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
    }
    return list
  }, [contacts, filter, query])

  const toggle = (key: ContactFilter) => setFilter((prev) => (prev === key ? 'all' : key))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contacts"
        description="Everyone attached to your cases — clients, adjusters, providers, and experts."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search contacts…"
                className="w-52 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            {isFirmAdmin && (
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setScope('mine')}
                  className={`rounded-md px-3 py-1.5 ${scope === 'mine' ? 'bg-brand-600 text-white' : 'text-slate-600'}`}
                >
                  My contacts
                </button>
                <button
                  type="button"
                  onClick={() => setScope('firm')}
                  className={`rounded-md px-3 py-1.5 ${scope === 'firm' ? 'bg-brand-600 text-white' : 'text-slate-600'}`}
                >
                  Firm
                </button>
              </div>
            )}
          </div>
        }
      />

      <StatGrid columns={4}>
        <FilterStat value={counts.client} label="Clients" tone="info" active={filter === 'client'} onClick={() => toggle('client')} />
        <FilterStat value={counts.adjuster} label="Adjusters" tone="warning" active={filter === 'adjuster'} onClick={() => toggle('adjuster')} />
        <FilterStat value={counts.provider} label="Providers" active={filter === 'provider'} onClick={() => toggle('provider')} />
        <FilterStat value={counts.expert} label="Experts" tone="success" active={filter === 'expert'} onClick={() => toggle('expert')} />
      </StatGrid>

      <SectionCard title={FILTER_LABEL[filter]} trailing={<Badge tone="brand">{visible.length} shown</Badge>}>
        <DataTable
          columns={contactColumns}
          rows={visible}
          rowKey={(c) => c.id}
          loading={loading}
          error={error}
          loadingMessage="Loading contacts…"
          emptyMessage={query.trim() ? 'No contacts match your search.' : 'No contacts yet. Clients and adjusters appear here automatically as cases progress.'}
        />
      </SectionCard>
    </div>
  )
}
