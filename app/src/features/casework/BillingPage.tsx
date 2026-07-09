import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAttorneyFeesYtd } from '../../lib/api'
import { Avatar, Badge, ClientLink, DataTable, EmptyState, PageHeader, SectionCard, type DataTableColumn } from '../shared/ui'

interface FeeCase {
  leadId?: string | null
  assessmentId?: string | null
  claimType?: string | null
  clientName?: string | null
  amount: number
}

interface FeesYtd {
  feesYtd: number
  year: number
  cases: FeeCase[]
}

function money(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '$0'
  return `$${Math.round(value).toLocaleString()}`
}

const feeColumns: DataTableColumn<FeeCase>[] = [
  {
    key: 'client',
    header: 'Client / case',
    cell: (c) => (
      <div className="flex items-center gap-3">
        <Avatar name={c.clientName || c.claimType || 'Case'} />
        <ClientLink name={c.clientName || c.claimType || 'Case'} leadId={c.leadId} section="billing" />
      </div>
    ),
  },
  {
    key: 'type',
    header: 'Type',
    cell: (c) => <span className="capitalize text-slate-500">{(c.claimType || '—').replace(/_/g, ' ')}</span>,
  },
  {
    key: 'amount',
    header: 'Fees YTD',
    align: 'right',
    cellClassName: 'tabular-nums font-semibold text-slate-900',
    cell: (c) => money(c.amount),
  },
]

export default function BillingPage() {
  const [data, setData] = useState<FeesYtd | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAttorneyFeesYtd()
      .then((res: FeesYtd) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err?.response?.data?.error || err?.message || 'Failed to load billing'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Billing"
        description="Fees collected year-to-date, rolled up from every case's payments."
        actions={
          <Link
            to="/attorney-billing"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Full billing
          </Link>
        }
      />

      {loading ? (
        <EmptyState message="Loading billing…" />
      ) : error ? (
        <EmptyState message={error} />
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
            <p className="text-xs font-medium text-slate-500">Fees YTD ({data?.year})</p>
            <p className="mt-1 text-3xl font-bold text-emerald-600">{money(data?.feesYtd)}</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Sum of collected client payments dated on or after Jan 1 of the current year, across all your cases.
            </p>
          </div>

          <SectionCard
            title="Fees by case"
            trailing={<Badge tone="brand">{data?.cases.length ?? 0} cases</Badge>}
          >
            <DataTable
              columns={feeColumns}
              rows={data?.cases ?? []}
              rowKey={(c, i) => c.leadId ?? c.assessmentId ?? String(i)}
              emptyMessage="No collected fees recorded this year yet."
            />
          </SectionCard>
        </>
      )}
    </div>
  )
}
