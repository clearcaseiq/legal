import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import {
  getAdminPayments,
  reconcileAdminPayments,
  type AdminPayment,
  type AdminPaymentOutcome,
} from '../lib/api'
import { getAdminLoginPath, isAdminAuthError } from '../lib/auth'
import {
  Badge,
  DataTable,
  PageHeader,
  Pagination,
  SectionCard,
  type DataTableColumn,
} from '../features/shared/ui'

const DEFAULT_LIMIT = 50

/**
 * A row's status decides whether it is money, and the wording matters: "waived"
 * and "pending" both mean nothing was collected, but only one of them is a
 * problem worth chasing.
 */
const OUTCOME_META: Record<
  AdminPaymentOutcome,
  { label: string; tone: 'success' | 'warning' | 'neutral' | 'danger'; hint: string }
> = {
  collected: { label: 'Collected', tone: 'success', hint: 'Settled through Stripe.' },
  pending: { label: 'Pending', tone: 'warning', hint: 'Checkout opened but not yet completed.' },
  abandoned: { label: 'Abandoned', tone: 'neutral', hint: 'The attorney never finished checkout.' },
  subscription: {
    label: 'On subscription',
    tone: 'success',
    hint: 'Covered by a plan the attorney already paid for, so it is $0 here.',
  },
  waived: {
    label: 'Waived',
    tone: 'danger',
    hint: 'No charge was created because payments were off or Stripe was unconfigured.',
  },
  other: { label: 'Other', tone: 'neutral', hint: '' },
}

const TYPE_LABELS: Record<string, string> = {
  routing_fee: 'Case routing fee',
  routing_fee_subscription_credit: 'Included case (subscription)',
  attorney_subscription: 'Subscription',
  subscription: 'Subscription',
  lead_credit: 'Lead credits',
  featured_placement: 'Featured placement',
  platform_fee: 'Platform fee',
}

function money(amount: number | null | undefined, currency = 'usd') {
  if (amount == null) return '—'
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: (currency || 'usd').toUpperCase(),
  }).format(amount)
}

function stripeUrl(row: AdminPayment): string | null {
  if (row.stripePaymentIntentId) return `https://dashboard.stripe.com/payments/${row.stripePaymentIntentId}`
  if (row.stripeCheckoutSessionId) {
    return `https://dashboard.stripe.com/checkout/sessions/${row.stripeCheckoutSessionId}`
  }
  return null
}

export default function AdminPayments() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<AdminPayment[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [byType, setByType] = useState<{ type: string; amount: number; count: number }[]>([])
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reconciling, setReconciling] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [outcome, setOutcome] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchTerm.trim())
      setOffset(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminPayments({
        limit,
        offset,
        search: appliedSearch || undefined,
        outcome: outcome || undefined,
        type: typeFilter || undefined,
        from: from || undefined,
        to: to || undefined,
      })
      setRows(data.data || [])
      setSummary(data.summary || null)
      setByType(data.byType || [])
      setTotal(data.total ?? (data.data?.length || 0))
    } catch (err: any) {
      if (isAdminAuthError(err)) {
        navigate(getAdminLoginPath('/admin/payments'), { replace: true })
        return
      }
      setError(err.response?.data?.error || 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [limit, offset, appliedSearch, outcome, typeFilter, from, to, navigate])

  useEffect(() => {
    load()
  }, [load])

  const handleReconcile = async () => {
    try {
      setReconciling(true)
      setError(null)
      setNotice(null)
      const result = await reconcileAdminPayments()
      setNotice(
        result.settled || result.expired
          ? `Checked ${result.examined} transaction${result.examined === 1 ? '' : 's'} against Stripe: ${result.settled} settled as paid (${money(result.recoveredAmount)} recovered), ${result.expired} retired as abandoned.`
          : `Checked ${result.examined} transaction${result.examined === 1 ? '' : 's'} against Stripe. Everything already matched.`,
      )
      await load()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reconcile with Stripe')
    } finally {
      setReconciling(false)
    }
  }

  const typeOptions = useMemo(
    () => Array.from(new Set(byType.map((t) => t.type))).sort(),
    [byType],
  )

  const columns: DataTableColumn<AdminPayment>[] = [
    {
      key: 'attorney',
      header: 'Attorney',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900 dark:text-slate-100">
            {row.attorney?.name || 'Unknown attorney'}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {row.attorney?.firmName || row.attorney?.email || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'What for',
      cell: (row) => (
        <span className="text-sm text-slate-700 dark:text-slate-300">
          {TYPE_LABELS[row.type] || row.type}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (row) => (
        <span
          className={
            row.outcome === 'collected'
              ? 'font-medium tabular-nums text-slate-900 dark:text-slate-100'
              : 'tabular-nums text-slate-500 dark:text-slate-400'
          }
        >
          {money(row.amount, row.currency)}
        </span>
      ),
    },
    {
      key: 'outcome',
      header: 'Outcome',
      cell: (row) => {
        const meta = OUTCOME_META[row.outcome] || OUTCOME_META.other
        return (
          <span title={meta.hint}>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </span>
        )
      },
    },
    {
      key: 'date',
      header: 'Date',
      cell: (row) => (
        <span className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
          {new Date(row.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'stripe',
      header: '',
      cell: (row) => {
        const url = stripeUrl(row)
        if (!url) return <span className="text-xs text-slate-400">—</span>
        return (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Stripe
            <ExternalLink className="h-3 w-3" />
          </a>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attorney transactions"
        description="Every charge attorneys have made to ClearCaseIQ — routing fees, subscriptions, lead credits and featured placement. Waived and subscription-covered cases are listed too, so a case that generated no revenue is visible rather than missing."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleReconcile}
              disabled={reconciling}
              className="btn-outline text-ui-sm"
              title="Ask Stripe about anything still reading as pending and correct it"
            >
              {reconciling ? 'Checking Stripe…' : 'Reconcile with Stripe'}
            </button>
            <button type="button" onClick={() => navigate('/admin')} className="btn-outline text-ui-sm">
              Back to dashboard
            </button>
          </div>
        }
      />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SectionCard title="Collected">
            <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {money(summary.collected)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {summary.collectedCount} settled payment{summary.collectedCount === 1 ? '' : 's'}
            </p>
          </SectionCard>
          <SectionCard title="Pending">
            <p className="text-2xl font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {money(summary.pending)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {summary.pendingCount} checkout{summary.pendingCount === 1 ? '' : 's'} not finished
            </p>
          </SectionCard>
          <SectionCard title="Waived">
            <p className="text-2xl font-semibold tabular-nums text-rose-600 dark:text-rose-400">
              {summary.waivedCount}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Fees never charged because payments were off
            </p>
          </SectionCard>
          <SectionCard title="On subscription">
            <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {summary.subscriptionCount}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Cases covered by an existing plan
            </p>
          </SectionCard>
        </div>
      )}

      <SectionCard
        title={`${total.toLocaleString()} transaction${total === 1 ? '' : 's'}`}
        trailing={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <select
              value={outcome}
              onChange={(e) => {
                setOutcome(e.target.value)
                setOffset(0)
              }}
              className="input w-auto"
              aria-label="Filter by outcome"
            >
              <option value="">All outcomes</option>
              {(Object.keys(OUTCOME_META) as AdminPaymentOutcome[]).map((key) => (
                <option key={key} value={key}>
                  {OUTCOME_META[key].label}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value)
                setOffset(0)
              }}
              className="input w-auto"
              aria-label="Filter by type"
            >
              <option value="">All types</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t] || t}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
                setOffset(0)
              }}
              className="input w-auto"
              aria-label="From date"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value)
                setOffset(0)
              }}
              className="input w-auto"
              aria-label="To date"
            />
            <input
              className="input w-full sm:w-56"
              placeholder="Search attorney or firm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        }
      >
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          loading={loading}
          loadingMessage="Loading transactions…"
          emptyMessage={
            appliedSearch || outcome || typeFilter || from || to
              ? 'No transactions match these filters.'
              : 'No attorney transactions recorded yet.'
          }
        />

        <Pagination
          total={total}
          limit={limit}
          offset={offset}
          disabled={loading}
          onChange={setOffset}
          onLimitChange={(next) => {
            setLimit(next)
            setOffset(0)
          }}
          className="mt-4"
        />
      </SectionCard>
    </div>
  )
}
