import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getAssistanceCounts,
  getAssistanceQueue,
  getAssistanceSpecialists,
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
  // Newest first, to match opening on New: the queue's first screen is the work
  // that just arrived, in the order it arrived.
  const [sort, setSort] = useState('newest')
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')

  const [counts, setCounts] = useState<Awaited<ReturnType<typeof getAssistanceCounts>>['counts'] | null>(null)

  // Whose cases, and opened when. Both scope the counts strip and the table
  // together — a strip describing a different population than the rows beneath
  // it is worse than no strip.
  const [assignee, setAssignee] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [team, setTeam] = useState<{ id: string; name: string; role?: string }[]>([])

  // Seeded from the stored role instead of waiting for the counts response, so
  // the manager-only controls hold their place from the first paint rather than
  // appearing a round trip later and shoving the table down. The server still
  // decides: the counts response corrects this, and the endpoints ignore a
  // scope the caller is not allowed to widen to.
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
        assignee: assignee || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
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
  }, [tab, status, priority, appliedSearch, assignee, fromDate, toDate, sort, limit, offset])

  useEffect(() => {
    load()
  }, [load])

  // Counts are loaded once per filter change rather than with every page, since
  // paging through results does not change them.
  useEffect(() => {
    let cancelled = false
    getAssistanceCounts({
      assignee: assignee || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
    })
      .then((result) => {
        if (cancelled) return
        setCounts(result.counts)
        setIsManager(result.isManager)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [tab, status, priority, appliedSearch, assignee, fromDate, toDate])

  // Only managers can look at anyone else's queue, so only they need the list.
  useEffect(() => {
    if (!isManager) return
    let cancelled = false
    getAssistanceSpecialists()
      .then((result) => !cancelled && setTeam(result.data))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [isManager])

  const applyTab = (next: Tab) => {
    setTab(next)
    setOffset(0)
  }

  /**
   * Picking a person answers the same question the tabs do, so the tabs follow
   * rather than contradict it — otherwise selecting a colleague while on "My
   * cases" asks for cases that are both theirs and yours, and returns nothing.
   */
  const applyAssignee = (next: string) => {
    setAssignee(next)
    setOffset(0)
    if (next) setTab('all')
  }

  const applyDate = (which: 'from' | 'to', value: string) => {
    if (which === 'from') setFromDate(value)
    else setToDate(value)
    setOffset(0)
  }

  const scopeIsFiltered = !!(assignee || fromDate || toDate)

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
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Replaces a roster card that listed each specialist and their
                counts but could not be acted on. The same information is more
                useful as a control: pick a person and the whole strip below
                re-counts as theirs. */}
            {isManager && (
              <select
                value={assignee}
                onChange={(e) => applyAssignee(e.target.value)}
                className="input w-auto"
                aria-label="Filter by assigned user"
              >
                <option value="">All users</option>
                <option value="unassigned">Unassigned</option>
                {team.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                    {member.role === 'admin' ? ' (Admin)' : ''}
                  </option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => applyDate('from', e.target.value)}
                className="input w-auto"
                aria-label="Cases opened from"
              />
              <span className="text-sm text-slate-400">to</span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => applyDate('to', e.target.value)}
                className="input w-auto"
                aria-label="Cases opened up to"
              />
            </div>
            {scopeIsFiltered && (
              <button
                type="button"
                onClick={() => {
                  setAssignee('')
                  setFromDate('')
                  setToDate('')
                  setOffset(0)
                }}
                className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
              >
                Clear
              </button>
            )}
          </div>
        }
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
