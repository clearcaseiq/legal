import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, Download, RefreshCw, ScrollText } from 'lucide-react'
import {
  getAuditLogFacets,
  listAuditLogs,
  type AuditLogEntry,
} from '../../lib/api'
import EmptyState from '../../components/EmptyState'
import {
  Badge,
  DataTable,
  PageHeader,
  Pagination,
  SectionCard,
} from '../../features/shared/ui'
import { getAdminLoginPath, isAdminAuthError } from '../../lib/auth'

const DEFAULT_LIMIT = 50

/** Actions are stored as raw strings; group them into tones so a scan reads fast. */
function actionTone(action: string, statusCode: number | null) {
  if (statusCode != null && statusCode >= 400) return 'danger' as const
  if (/(deleted|rejected|failed|deactivated|unverified|revoked)/i.test(action)) return 'danger' as const
  if (/(routed|approved|verified|activated|released|created)/i.test(action)) return 'success' as const
  if (/(updated|changed|corrected|held|requested)/i.test(action)) return 'warning' as const
  return 'neutral' as const
}

/**
 * The global request middleware writes actions as `"POST /v1/admin/..."`, while
 * deliberate admin actions use snake_case names. Render both readably without
 * mangling the underlying value.
 */
function humanizeAction(action: string) {
  if (/^[A-Z]+\s/.test(action)) return action
  return action.replace(/_/g, ' ')
}

function actorLabel(log: AuditLogEntry) {
  if (log.user) {
    const name = [log.user.firstName, log.user.lastName].filter(Boolean).join(' ').trim()
    return name || log.user.email
  }
  if (log.attorney) return log.attorney.name || log.attorney.email || 'Attorney'
  // Unauthenticated requests (failed logins, webhooks) legitimately have no actor.
  return 'System / anonymous'
}

/** metadata is a JSON string column; show it formatted when it parses. */
function formatMetadata(raw: string | null): string | null {
  if (!raw) return null
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

/**
 * Audit entries need the time of day, not just the date, so this doesn't reuse
 * the shared `formatDate` (which is date-only).
 */
function formatTimestamp(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

/** Local datetime-local input value -> ISO, treating the input as local time. */
function toIso(value: string): string | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

export default function AdminAuditLogs() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  // The applied filters are separate from the inputs so typing doesn't refetch
  // on every keystroke — the query runs when Apply is pressed.
  const [applied, setApplied] = useState({ action: '', entityType: '', search: '', from: '', to: '' })

  const [facets, setFacets] = useState<{
    actions: Array<{ value: string; count: number }>
    entityTypes: Array<{ value: string; count: number }>
  }>({ actions: [], entityTypes: [] })

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const page = await listAuditLogs({
        limit,
        offset,
        action: applied.action || undefined,
        entityType: applied.entityType || undefined,
        search: applied.search || undefined,
        from: toIso(applied.from),
        to: toIso(applied.to),
      })
      setLogs(page.logs || [])
      setTotal(page.total || 0)
    } catch (err: any) {
      if (isAdminAuthError(err)) {
        navigate(getAdminLoginPath('/admin/audit-logs'), { replace: true })
        return
      }
      setError(err?.response?.data?.error || 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [limit, offset, applied, navigate])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    getAuditLogFacets()
      .then(setFacets)
      .catch(() => {
        // Filter dropdowns degrade to free text; not worth surfacing an error.
      })
  }, [])

  const applyFilters = () => {
    setOffset(0)
    setApplied({ action, entityType, search, from, to })
  }

  const resetFilters = () => {
    setAction('')
    setEntityType('')
    setSearch('')
    setFrom('')
    setTo('')
    setOffset(0)
    setApplied({ action: '', entityType: '', search: '', from: '', to: '' })
  }

  const hasFilters = Boolean(
    applied.action || applied.entityType || applied.search || applied.from || applied.to
  )

  /** Export the loaded page. The server caps a page at 200 rows. */
  const exportCsv = () => {
    const header = ['Timestamp', 'Action', 'Actor', 'Entity type', 'Entity ID', 'Status', 'IP']
    const rows = logs.map((log) => [
      new Date(log.createdAt).toISOString(),
      log.action,
      actorLabel(log),
      log.entityType || '',
      log.entityId || '',
      log.statusCode == null ? '' : String(log.statusCode),
      log.ipAddress || '',
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const columns = useMemo(
    () => [
      {
        key: 'expand',
        header: '',
        headerClassName: 'w-8',
        cell: (log: AuditLogEntry) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setExpandedId(expandedId === log.id ? null : log.id)
            }}
            aria-label={expandedId === log.id ? 'Hide details' : 'Show details'}
            className="text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
          >
            {expandedId === log.id ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ),
      },
      {
        key: 'createdAt',
        header: 'When',
        cell: (log: AuditLogEntry) => (
          <span className="whitespace-nowrap text-slate-700 dark:text-slate-300">
            {formatTimestamp(log.createdAt)}
          </span>
        ),
      },
      {
        key: 'action',
        header: 'Action',
        cell: (log: AuditLogEntry) => (
          <Badge tone={actionTone(log.action, log.statusCode)}>{humanizeAction(log.action)}</Badge>
        ),
      },
      {
        key: 'actor',
        header: 'Actor',
        cell: (log: AuditLogEntry) => (
          <span className="text-slate-700 dark:text-slate-300">{actorLabel(log)}</span>
        ),
      },
      {
        key: 'entity',
        header: 'Entity',
        cell: (log: AuditLogEntry) =>
          log.entityType ? (
            <div>
              <div className="text-slate-700 dark:text-slate-300">{log.entityType}</div>
              {log.entityId && (
                <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  {log.entityId}
                </div>
              )}
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        key: 'status',
        header: 'Status',
        align: 'right' as const,
        cell: (log: AuditLogEntry) =>
          log.statusCode == null ? (
            <span className="text-slate-400">—</span>
          ) : (
            <span
              className={
                log.statusCode >= 400
                  ? 'font-medium text-rose-600 dark:text-rose-400'
                  : 'text-slate-600 dark:text-slate-400'
              }
            >
              {log.statusCode}
            </span>
          ),
      },
    ],
    [expandedId]
  )

  const expanded = expandedId ? logs.find((l) => l.id === expandedId) : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit logs"
        description="Every mutating request and deliberate admin action, newest first."
        actions={
          <>
            <button
              onClick={exportCsv}
              disabled={logs.length === 0}
              className="btn-outline inline-flex items-center gap-2 text-ui-sm disabled:opacity-40"
              title="Export the rows currently on screen"
            >
              <Download className="h-4 w-4" />
              Export page
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="btn-outline inline-flex items-center gap-2 text-ui-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </>
        }
      />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      <SectionCard title="Filters">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Action
              </span>
              <input
                list="audit-actions"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="Any action"
                className="input"
              />
              <datalist id="audit-actions">
                {facets.actions.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.count}
                  </option>
                ))}
              </datalist>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Entity type
              </span>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="input"
              >
                <option value="">Any entity</option>
                {facets.entityTypes.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.value} ({e.count})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Search
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                placeholder="Entity ID, action, or metadata"
                className="input"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                From
              </span>
              <input
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="input"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                To
              </span>
              <input
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="input"
              />
            </label>

            <div className="flex items-end gap-2">
              <button onClick={applyFilters} className="btn-primary text-ui-sm">
                Apply
              </button>
              {hasFilters && (
                <button onClick={resetFilters} className="btn-outline text-ui-sm">
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={`${total.toLocaleString()} entr${total === 1 ? 'y' : 'ies'}`}
        trailing={
          hasFilters ? <Badge tone="blue">Filtered</Badge> : <Badge tone="neutral">All</Badge>
        }
      >
        {!loading && logs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={hasFilters ? 'No entries match these filters' : 'No audit entries yet'}
            description={
              hasFilters
                ? 'Try widening the date range or clearing the action filter.'
                : 'Entries appear here as soon as anyone performs a mutating request.'
            }
            compact
          >
            {hasFilters && (
              <button onClick={resetFilters} className="btn-outline text-ui-sm">
                Clear filters
              </button>
            )}
          </EmptyState>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={logs}
              rowKey={(log) => log.id}
              loading={loading}
              loadingMessage="Loading audit entries…"
              onRowClick={(log) => setExpandedId(expandedId === log.id ? null : log.id)}
            />

            {expanded && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {humanizeAction(expanded.action)}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatTimestamp(expanded.createdAt)}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                  <div>
                    <dt className="text-xs text-slate-500 dark:text-slate-400">Actor</dt>
                    <dd className="text-slate-800 dark:text-slate-200">{actorLabel(expanded)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500 dark:text-slate-400">IP address</dt>
                    <dd className="font-mono text-slate-800 dark:text-slate-200">
                      {expanded.ipAddress || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500 dark:text-slate-400">Entity</dt>
                    <dd className="text-slate-800 dark:text-slate-200">
                      {expanded.entityType || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500 dark:text-slate-400">Entity ID</dt>
                    <dd className="break-all font-mono text-xs text-slate-800 dark:text-slate-200">
                      {expanded.entityId || '—'}
                    </dd>
                  </div>
                </dl>
                {expanded.userAgent && (
                  <p className="mt-3 break-all text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium">User agent:</span> {expanded.userAgent}
                  </p>
                )}
                {formatMetadata(expanded.metadata) && (
                  <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-white p-3 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {formatMetadata(expanded.metadata)}
                  </pre>
                )}
              </div>
            )}

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
          </>
        )}
      </SectionCard>
    </div>
  )
}
