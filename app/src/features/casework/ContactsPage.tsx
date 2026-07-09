import { useEffect, useMemo, useState } from 'react'
import { getAllCaseContacts, getFirmCaseContacts } from '../../lib/api'
import { useAttorneyWorkspace } from '../shared/AttorneyWorkspaceContext'
import { Avatar, Badge, ClientLink, DataTable, FilterStat, PageHeader, SectionCard, StatGrid, type DataTableColumn } from '../shared/ui'

interface CaseContactRow {
  id: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  companyName?: string | null
  title?: string | null
  contactType?: string | null
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

const contactColumns: DataTableColumn<CaseContactRow>[] = [
  {
    key: 'name',
    header: 'Name',
    cell: (c) => (
      <div className="flex items-center gap-3">
        <Avatar name={contactName(c)} />
        <span className="font-medium text-slate-800">{contactName(c)}</span>
      </div>
    ),
  },
  {
    key: 'type',
    header: 'Type',
    cell: (c) => <span className="capitalize text-slate-500">{(c.contactType || '—').replace(/_/g, ' ')}</span>,
  },
  { key: 'company', header: 'Company', cell: (c) => <span className="text-slate-500">{c.companyName || '—'}</span> },
  { key: 'email', header: 'Email', cell: (c) => <span className="text-slate-500">{c.email || '—'}</span> },
  {
    key: 'case',
    header: 'Case',
    cell: (c) => <ClientLink name={c.lead?.assessment?.claimType || 'Case'} leadId={c.lead?.id} section="contacts" />,
  },
]

export default function ContactsPage() {
  const { isFirmAdmin } = useAttorneyWorkspace()
  const [scope, setScope] = useState<'mine' | 'firm'>('mine')
  const [contacts, setContacts] = useState<CaseContactRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ContactFilter>('all')

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
    if (filter === 'all') return contacts
    return contacts.filter((c) => categoryOf(c.contactType) === filter)
  }, [contacts, filter])

  const toggle = (key: ContactFilter) => setFilter((prev) => (prev === key ? 'all' : key))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contacts"
        description="Everyone attached to your cases — clients, adjusters, providers, and experts."
        actions={
          isFirmAdmin ? (
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
          ) : undefined
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
          emptyMessage="No contacts match this filter."
        />
      </SectionCard>
    </div>
  )
}
