import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getAdminAttorneys,
  updateAdminAttorneyStatus,
  updateAdminAttorneyVerification,
} from '../../lib/api'
import {
  Ban,
  CheckCircle,
  Clock,
  ExternalLink,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
} from 'lucide-react'
import { formatSpecialty } from '../../lib/constants'
import { formatEnumLabel, capitalizeWords, formatJurisdictions } from '../../lib/formatters'
import {
  Avatar,
  Badge,
  DataTable,
  PageHeader,
  Pagination,
  SectionCard,
  type DataTableColumn,
} from '../../features/shared/ui'

/** Human-readable "State (County, County)" from a venue/jurisdiction entry. */
function formatVenue(item: any): string {
  if (!item) return ''
  if (typeof item === 'string') return formatEnumLabel(item)
  const state = item.state || item.name || ''
  const counties = Array.isArray(item.counties) ? item.counties.join(', ') : ''
  return counties ? `${state} (${counties})` : String(state || '')
}

/** Summarize an attorney's coverage, falling back from venues to profile jurisdictions. */
function formatVenueSummary(a: any): string {
  const source = Array.isArray(a.venues) && a.venues.length
    ? a.venues
    : Array.isArray(a.profile?.jurisdictions)
    ? a.profile.jurisdictions
    : null
  if (!source) {
    if (typeof a.venues === 'string' && a.venues) return formatJurisdictions(a.venues)
    if (typeof a.profile?.jurisdictions === 'string' && a.profile.jurisdictions) return formatJurisdictions(a.profile.jurisdictions)
    return '—'
  }
  const labels = source.map(formatVenue).filter(Boolean)
  if (labels.length === 0) return '—'
  const shown = labels.slice(0, 2).join(', ')
  return labels.length > 2 ? `${shown} +${labels.length - 2}` : shown
}

/** Summarize an attorney's case types with friendly labels (no raw underscores). */
function formatSpecialtiesSummary(a: any): string {
  if (Array.isArray(a.specialties) && a.specialties.length) {
    const labels = a.specialties.map((s: string) => formatSpecialty(s))
    const shown = labels.slice(0, 2).join(', ')
    return labels.length > 2 ? `${shown} +${labels.length - 2}` : shown
  }
  if (typeof a.specialties === 'string' && a.specialties) return formatSpecialty(a.specialties)
  return '—'
}

function formatLastActive(value?: string | null) {
  if (!value) return 'Never logged in'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

const DEFAULT_LIMIT = 50

export default function AdminAttorneys() {
  const navigate = useNavigate()
  const [attorneys, setAttorneys] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  // Search runs server-side, so debounce the input rather than filtering the
  // page in memory (which would only ever search the rows already fetched).
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchTerm.trim())
      setOffset(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const loadAttorneys = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminAttorneys({
        limit,
        offset,
        search: appliedSearch || undefined,
        status: statusFilter,
      })
      setAttorneys(data.attorneys || [])
      setTotal(data.total ?? (data.attorneys?.length || 0))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load attorneys')
    } finally {
      setLoading(false)
    }
  }, [limit, offset, appliedSearch, statusFilter])

  useEffect(() => {
    loadAttorneys()
  }, [loadAttorneys])

  const setActive = async (attorney: any, isActive: boolean) => {
    setPendingAction(attorney.id)
    setActionError(null)
    try {
      await updateAdminAttorneyStatus(attorney.id, isActive)
      await loadAttorneys()
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to update attorney status')
    } finally {
      setPendingAction(null)
    }
  }

  const setVerified = async (attorney: any, isVerified: boolean) => {
    setPendingAction(attorney.id)
    setActionError(null)
    try {
      await updateAdminAttorneyVerification(attorney.id, isVerified)
      await loadAttorneys()
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to update attorney verification')
    } finally {
      setPendingAction(null)
    }
  }

  const columns: DataTableColumn<any>[] = [
    {
      key: 'attorney',
      header: 'Attorney / Firm',
      cell: (a) => {
        const name = capitalizeWords(a.name) || a.email || '—'
        return (
          <div className="flex items-start gap-3">
            <Avatar name={name} />
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900 dark:text-slate-100">{name}</p>
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                {capitalizeWords(a.lawFirm?.name) || '—'}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center">
                  <Star className="mr-1 h-3 w-3 text-amber-400" />
                  {typeof a.averageRating === 'number' ? a.averageRating.toFixed(1) : '0.0'}
                </span>
                <span>{a.totalReviews || 0} reviews</span>
                <span className="inline-flex items-center text-emerald-700 dark:text-emerald-400">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  {a.verifiedReviewCount || 0} verified
                </span>
              </div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'coverage',
      header: 'States / Counties',
      cell: (a) => <span className="text-slate-700 dark:text-slate-300">{formatVenueSummary(a)}</span>,
    },
    {
      key: 'caseTypes',
      header: 'Case types',
      cell: (a) => (
        <span className="text-slate-700 dark:text-slate-300">{formatSpecialtiesSummary(a)}</span>
      ),
    },
    {
      key: 'tier',
      header: 'Tier',
      cell: (a) => (
        <Badge tone="neutral">
          {a.subscriptionTier || a.profile?.subscriptionTier || 'Standard'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (a) => (
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={a.isActive ? 'success' : 'neutral'}>
              {a.isActive ? 'Active' : 'Inactive'}
            </Badge>
            {/* Verification gates routing eligibility, so it belongs next to active state. */}
            <Badge tone={a.isVerified ? 'blue' : 'warning'}>
              {a.isVerified ? 'Verified' : 'Unverified'}
            </Badge>
          </div>
          <div className="mt-2 flex items-center text-xs text-slate-500 dark:text-slate-400">
            <Clock className="mr-1 h-3 w-3" />~{a.responseTimeHours ?? 24}h response
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Last active: {formatLastActive(a.lastActiveAt)}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (a) => {
        const busy = pendingAction === a.id
        // Icon-only 14px buttons read as decoration and gave no clue what they
        // did; these are destructive-ish admin actions, so they get real labels
        // and a proper hit area (CP-440).
        const btn =
          'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40'
        return (
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation()
                void setVerified(a, !a.isVerified)
              }}
              title={a.isVerified ? 'Remove verification' : 'Mark verified: allows routing'}
              className={`${btn} ${
                a.isVerified
                  ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {a.isVerified ? 'Unverify' : 'Mark verified'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation()
                void setActive(a, !a.isActive)
              }}
              title={a.isActive ? 'Deactivate: removes from routing' : 'Reactivate'}
              className={`${btn} ${
                a.isActive
                  ? 'border-slate-200 text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-400'
                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
              }`}
            >
              {a.isActive ? <Ban className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
              {a.isActive ? 'Deactivate' : 'Reactivate'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/admin/attorneys/${a.id}`)
              }}
              title={`Open ${capitalizeWords(a.name) || 'attorney'}`}
              className={`${btn} border-brand-200 text-brand-700 hover:bg-brand-50 dark:border-brand-900 dark:text-brand-400 dark:hover:bg-brand-950/40`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Details
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attorneys"
        description="Every attorney in the routing network, with coverage, tier, and responsiveness."
        actions={
          <button
            onClick={loadAttorneys}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      {(error || actionError) && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error || actionError}
        </div>
      )}

      <SectionCard
        title={`${total.toLocaleString()} attorney${total === 1 ? '' : 's'}`}
        trailing={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setOffset(0)
              }}
              className="input w-auto"
              aria-label="Filter by status"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="unverified">Unverified</option>
              <option value="verified">Verified</option>
              <option value="all">All</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search attorneys…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-9"
              />
            </div>
          </div>
        }
      >
        <DataTable
          columns={columns}
          rows={attorneys}
          rowKey={(a) => a.id}
          onRowClick={(a) => navigate(`/admin/attorneys/${a.id}`)}
          loading={loading}
          loadingMessage="Loading attorneys…"
          emptyMessage={appliedSearch ? 'No attorneys match your search.' : 'No attorneys found.'}
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
