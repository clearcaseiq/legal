import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getAssistanceCounts,
  getAssistanceManagerOverview,
  getAssistanceQueue,
  type AssistanceQueueRow,
} from '../../lib/api'
import {
  Avatar,
  Badge,
  DataTable,
  FilterStat,
  PageHeader,
  Pagination,
  SectionCard,
  StatGrid,
  type DataTableColumn,
} from '../../features/shared/ui'
import {
  ASSISTANCE_STATUS_HINTS,
  ASSISTANCE_STATUS_LABELS,
  ASSISTANCE_STATUS_ORDER,
  ASSISTANCE_STATUS_TONES,
  PRIORITY_LABELS,
  dueLabel,
  humanize,
  timeAgo,
} from './assistanceLabels'
import { useAssistanceBasePath } from './useAssistanceBasePath'
import { formatClaimType } from '../../lib/claimTypes'
import { getStoredRole } from '../../lib/auth'

type Tab = 'mine' | 'unassigned' | 'all'

const DEFAULT_LIMIT = 25

/**
 * The specialist work queue.
 *
 * Rendered in two shells — the specialist app at `/assistance` and the admin
 * sidebar at `/admin/case-assistance` — so it owns no chrome and builds its own
 * links from the path it was mounted at.
 */
export default function CaseAssistanceQueue() {
  const navigate = useNavigate()
  const basePath = useAssistanceBasePath()

  const [rows, setRows] = useState<AssistanceQueueRow[]>([])
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [tab, setTab] = useState<Tab>('mine')
  // The queue always sits on one status. It used to open on an "Open statuses"
  // option that merged four of them, which made the list impossible to reconcile
  // against the counts above it — the strip said how many cases were in each
  // status and the table showed a blend of them.
  const [status, setStatus] = useState<string>(ASSISTANCE_STATUS_ORDER[0])
  const [priority, setPriority] = useState('')
  const [sort, setSort] = useState('due')
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')

  const [counts, setCounts] = useState<Awaited<ReturnType<typeof getAssistanceCounts>>['counts'] | null>(null)
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof getAssistanceManagerOverview>> | null>(null)

  // Seeded from the stored role instead of waiting for the counts response.
  // Manager-ness gates the Team card, and deriving it from a fetch made the
  // card arrive two round trips late — long after the table had painted — so
  // the whole page jumped down once the admin was recognized. The server still
  // decides: the counts response corrects this, and the overview request 403s
  // for anyone who only claims to be a manager here.
  const [isManager, setIsManager] = useState(() => getStoredRole() === 'admin')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await getAssistanceQueue({
        tab,
        status: status || undefined,
        priority: priority || undefined,
        search: appliedSearch || undefined,
        sort,
        limit,
        offset,
      })
      setRows(result.data || [])
      setTotal(result.total ?? 0)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load the queue')
    } finally {
      setLoading(false)
    }
  }, [tab, status, priority, appliedSearch, sort, limit, offset])

  useEffect(() => {
    load()
  }, [load])

  // Counts are loaded once per filter change rather than with every page, since
  // paging through results does not change them.
  useEffect(() => {
    let cancelled = false
    getAssistanceCounts()
      .then((result) => {
        if (cancelled) return
        setCounts(result.counts)
        setIsManager(result.isManager)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [tab, status, priority, appliedSearch])

  useEffect(() => {
    if (!isManager) return
    let cancelled = false
    getAssistanceManagerOverview()
      .then((result) => !cancelled && setOverview(result))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [isManager])

  const applyTab = (next: Tab) => {
    setTab(next)
    setOffset(0)
  }

  /** Tiles and the dropdown drive the same single-status filter. */
  const applyStatus = (next: string) => {
    setStatus(next)
    setOffset(0)
  }

  const columns = useMemo<DataTableColumn<AssistanceQueueRow>[]>(
    () => [
      {
        key: 'case',
        header: 'Case',
        cell: (row) => (
          <div className="flex items-center gap-2.5">
            <Avatar name={row.plaintiffName || row.caseName} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-800 dark:text-slate-200">{row.caseName}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {row.referenceCode || formatClaimType(row.claimType)}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'claimType',
        header: 'Claim type',
        cell: (row) => (
          <span className="text-sm text-slate-600 dark:text-slate-400">{formatClaimType(row.claimType)}</span>
        ),
      },
      {
        key: 'location',
        header: 'Location',
        cell: (row) => (
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {row.city || row.venueCounty || '—'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (row) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={ASSISTANCE_STATUS_TONES[row.status] ?? 'neutral'}>
              {ASSISTANCE_STATUS_LABELS[row.status] ?? row.status}
            </Badge>
            {/* A compliance hold, kept visually separate from the ops status —
                `request_info` is not the same thing as waiting on a claimant. */}
            {row.manualReviewStatus === 'pending' && <Badge tone="danger">On hold</Badge>}
            {row.priority === 'high' && <Badge tone="warning">High</Badge>}
          </div>
        ),
      },
      {
        key: 'assignee',
        header: 'Assignee',
        cell: (row) =>
          row.assignedSpecialist ? (
            <span className="text-sm text-slate-700 dark:text-slate-300">{row.assignedSpecialist.name}</span>
          ) : (
            <Badge tone="brand">Unassigned</Badge>
          ),
      },
      {
        key: 'nextAction',
        header: 'Next action',
        cell: (row) => (
          <span className="text-sm text-slate-600 dark:text-slate-400">{row.nextAction || '—'}</span>
        ),
      },
      {
        key: 'due',
        header: 'Review due',
        cell: (row) => (
          <span
            className={`text-sm ${row.isOverdue ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}
          >
            {dueLabel(row.reviewDueAt)}
          </span>
        ),
      },
      {
        key: 'lastContact',
        header: 'Last contact',
        cell: (row) => (
          <span className="text-sm text-slate-600 dark:text-slate-400">{timeAgo(row.lastContactAt)}</span>
        ),
      },
    ],
    [],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Case Assistance"
        description="Newly assessed cases waiting on a specialist. Call the claimant, walk them through what their case is missing, and hand it over when it is ready."
      />

      {/* Rendered before the counts arrive, showing a dash in place of each
          number. Gating the whole grid on the response meant the tiles dropped
          in above the table a moment after the page painted, shoving
          everything below them down. */}
      <StatGrid columns={4}>
        <FilterStat
          value={counts?.mine ?? '—'}
          label="My cases"
          active={tab === 'mine'}
          onClick={() => applyTab('mine')}
          hint="Open cases assigned to you."
        />
        {/* One tile per workflow status, in the order the flow runs. Each is a
            toggle on the same status filter the dropdown below drives, so the
            strip reads the queue and narrows it with one click. */}
        {ASSISTANCE_STATUS_ORDER.map((option) => (
          <FilterStat
            key={option}
            value={counts?.byStatus?.[option] ?? '—'}
            label={ASSISTANCE_STATUS_LABELS[option]}
            tone={ASSISTANCE_STATUS_TONES[option]}
            active={status === option}
            onClick={() => applyStatus(option)}
            hint={ASSISTANCE_STATUS_HINTS[option]}
          />
        ))}
      </StatGrid>

      {/* Mounted as soon as we believe the viewer is a manager, rather than
          waiting for the overview response, so the card occupies its place
          from the first paint instead of appearing after the table settles. */}
      {isManager && (
        <SectionCard title="Team">
          {!overview ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading the team…</p>
          ) : overview.specialists.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No active Case Specialists yet. Cases will collect in the unassigned queue until one exists — add them
              from Configuration → User Roles.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {overview.specialists.map((specialist) => (
                <div
                  key={specialist.id}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-700"
                >
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {specialist.name}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {/* Only listed here while holding a case, so the badge
                        explains why a supervisor is in the team roster. */}
                    {specialist.isAdmin && <Badge tone="neutral">Admin</Badge>}
                    <Badge tone="blue">{specialist.active} active</Badge>
                    {specialist.needsContact > 0 && (
                      <Badge tone="warning">{specialist.needsContact} to call</Badge>
                    )}
                    {specialist.overdue > 0 && <Badge tone="danger">{specialist.overdue} overdue</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <SectionCard
        title={
          <div className="flex flex-wrap items-center gap-1.5">
            {(['mine', 'unassigned', 'all'] as Tab[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => applyTab(option)}
                aria-pressed={tab === option}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  tab === option
                    ? 'bg-brand-100 text-brand-800 dark:bg-brand-950/50 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {option === 'mine' ? 'My cases' : option === 'unassigned' ? 'Unassigned' : 'All'}
              </button>
            ))}
          </div>
        }
        trailing={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setOffset(0)
              }}
              className="input w-auto"
              aria-label="Filter by status"
            >
              {ASSISTANCE_STATUS_ORDER.map((option) => (
                <option key={option} value={option}>
                  {ASSISTANCE_STATUS_LABELS[option]}
                </option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value)
                setOffset(0)
              }}
              className="input w-auto"
              aria-label="Filter by priority"
            >
              <option value="">Any priority</option>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="input w-auto"
              aria-label="Sort"
            >
              <option value="due">Review due first</option>
              <option value="contact">Longest since contact</option>
              <option value="oldest">Oldest first</option>
              <option value="newest">Newest first</option>
            </select>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setAppliedSearch(searchTerm.trim())
                setOffset(0)
              }}
            >
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, email or reference"
                aria-label="Search cases"
                className="input w-56"
              />
            </form>
          </div>
        }
      >
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          onRowClick={(row) => navigate(`${basePath}/${row.id}`)}
          // Only while there is nothing to show. `loading` goes true on every
          // tab, filter and page change, and DataTable's loading state is a
          // single line, so honouring it collapsed a full table to one row and
          // back on each click. Holding the previous rows keeps the table still
          // — Pagination below is already disabled during the fetch.
          loading={loading && rows.length === 0}
          loadingMessage="Loading the queue…"
          emptyMessage={
            tab === 'mine'
              ? 'Nothing assigned to you right now. Check the Unassigned tab.'
              : tab === 'unassigned'
                ? 'Every case has an owner.'
                : 'No cases match these filters.'
          }
        />
        <Pagination
          total={total}
          limit={limit}
          offset={offset}
          onChange={setOffset}
          onLimitChange={(next) => {
            setLimit(next)
            setOffset(0)
          }}
          disabled={loading}
          className="mt-3"
        />
      </SectionCard>
    </div>
  )
}
