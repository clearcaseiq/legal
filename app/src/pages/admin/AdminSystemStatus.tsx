import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Globe,
  Plug,
  RefreshCw,
  Repeat,
  Server,
  XCircle,
} from 'lucide-react'
import {
  getAdminSystemStatus,
  type AdminSystemStatus,
  type PublicSiteCheckState,
  type SystemStatusLevel,
} from '../../lib/api'
import { Badge, PageHeader, SectionCard, type BadgeTone } from '../../features/shared/ui'
import { getAdminLoginPath, isAdminAuthError } from '../../lib/auth'

const REFRESH_MS = 60_000

const LEVEL_COPY: Record<SystemStatusLevel, { label: string; tone: BadgeTone; blurb: string }> = {
  ok: {
    label: 'All systems normal',
    tone: 'success',
    blurb: 'Every check passed on the last run.',
  },
  degraded: {
    label: 'Degraded',
    tone: 'warning',
    blurb: 'The platform is serving traffic, but something needs attention.',
  },
  down: {
    label: 'Not serving',
    tone: 'danger',
    blurb: 'A core check is failing. Requests are likely erroring for users.',
  },
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m`
  return `${Math.floor(hours / 24)}d ${hours % 24}h`
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'never'
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  return `${formatDuration(seconds)} ago`
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="truncate text-right text-sm font-medium text-slate-800 dark:text-slate-200">
        {value}
      </dd>
    </div>
  )
}

function CheckLine({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <li className="flex items-start gap-2 py-1">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
      )}
      <span className="min-w-0">
        <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
        {detail && (
          <span className="block break-words text-xs text-slate-500 dark:text-slate-400">
            {detail}
          </span>
        )}
      </span>
    </li>
  )
}

const PUBLIC_SITE_TONE: Record<PublicSiteCheckState, BadgeTone> = {
  ok: 'success',
  warn: 'warning',
  fail: 'danger',
  skipped: 'neutral',
}

const PUBLIC_SITE_LABEL: Record<PublicSiteCheckState, string> = {
  ok: 'OK',
  warn: 'Attention',
  fail: 'Failing',
  skipped: 'Not checked',
}

function PublicSiteRow({
  label,
  state,
  detail,
}: {
  label: string
  state: PublicSiteCheckState
  detail: string
}) {
  return (
    <li className="py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
        <Badge tone={PUBLIC_SITE_TONE[state]}>{PUBLIC_SITE_LABEL[state]}</Badge>
      </div>
      <p className="mt-0.5 break-words text-xs text-slate-500 dark:text-slate-400">{detail}</p>
    </li>
  )
}

/**
 * One page that answers "is the platform working, and if not, what broke".
 *
 * Everything here is a read of state the API already tracks: the same readiness
 * probes the container healthcheck acts on, schema drift across every model,
 * the background sweeps, and recorded activity. Being served by the app it
 * reports on, it cannot tell you the app is down — that is what the container
 * healthchecks and the activity canary are for. It tells you *what* is wrong
 * once you know something is.
 */
export default function AdminSystemStatus() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<AdminSystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setStatus(await getAdminSystemStatus())
    } catch (err: any) {
      if (isAdminAuthError(err)) {
        navigate(getAdminLoginPath('/admin/system-status'), { replace: true })
        return
      }
      setError(err?.response?.data?.error || 'Failed to load system status')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const timer = setInterval(load, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  const level = status ? LEVEL_COPY[status.status] : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="System status"
        description="Live health of the API, database, background jobs, and integrations."
        actions={
          <button
            onClick={load}
            disabled={loading}
            className="btn-outline inline-flex items-center gap-2 text-ui-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      {!status && loading && (
        <SectionCard>
          <p className="text-sm text-slate-500 dark:text-slate-400">Running checks…</p>
        </SectionCard>
      )}

      {status && level && (
        <>
          <SectionCard
            title={
              <>
                <Activity className="h-4 w-4 text-brand-600" />
                Overall
              </>
            }
            trailing={<Badge tone={level.tone}>{level.label}</Badge>}
          >
            <p className="text-sm text-slate-600 dark:text-slate-400">{level.blurb}</p>
            {status.issues.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {status.issues.map((issue) => (
                  <li key={issue} className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{issue}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              Checked {timeAgo(status.checkedAt)} · refreshes automatically every minute. This page
              is served by the platform it reports on, so it cannot tell you the platform is down.
              If nothing loads at all, check the container health on the host.
            </p>
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title={
                <>
                  <Database className="h-4 w-4 text-brand-600" />
                  Database
                </>
              }
              trailing={
                <Badge tone={status.readiness.ok && status.schema.ok ? 'success' : 'danger'}>
                  {status.readiness.ok && status.schema.ok ? 'Healthy' : 'Problem'}
                </Badge>
              }
            >
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {status.readiness.probes.map((probe) => (
                  <CheckLine
                    key={probe.name}
                    ok={probe.ok}
                    label={`${probe.name} (${probe.durationMs}ms)`}
                    detail={probe.error}
                  />
                ))}
              </ul>

              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Schema
                  </h3>
                  <Badge tone={status.schema.ok ? 'success' : 'danger'}>
                    {status.schema.ok ? 'In sync' : 'Drifted'}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {status.schema.error
                    ? status.schema.error
                    : `${status.schema.checkedTables} tables compared against schema.prisma.`}
                </p>

                {status.schema.missingTables.length > 0 && (
                  <p className="mt-2 break-words text-sm text-rose-600 dark:text-rose-400">
                    Missing tables: {status.schema.missingTables.join(', ')}
                  </p>
                )}
                {status.schema.missingColumns.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-rose-600 dark:text-rose-400">
                      Missing columns. The API will error on any route that reads these:
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {status.schema.missingColumns.map((column) => (
                        <li
                          key={`${column.table}.${column.column}`}
                          className="font-mono text-xs text-rose-600 dark:text-rose-400"
                        >
                          {column.table}.{column.column}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Redeploy the API: the entrypoint runs <code>prisma db push</code> and now
                      exits if it cannot apply the schema.
                    </p>
                  </div>
                )}
                {status.schema.unexpectedTables.length > 0 && (
                  <p className="mt-2 break-words text-xs text-slate-500 dark:text-slate-400">
                    Tables no model owns (harmless, but worth knowing about):{' '}
                    {status.schema.unexpectedTables.join(', ')}
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title={
                <>
                  <Server className="h-4 w-4 text-brand-600" />
                  Deployment
                </>
              }
              trailing={<Badge tone="neutral">{status.runtime.environment}</Badge>}
            >
              <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                <Row
                  label="Commit"
                  value={
                    status.runtime.commit ? (
                      <span className="font-mono text-xs">{status.runtime.commit}</span>
                    ) : (
                      <span className="text-slate-400">not stamped</span>
                    )
                  }
                />
                <Row
                  label="Built"
                  value={
                    status.runtime.buildTime ? (
                      new Date(status.runtime.buildTime).toLocaleString()
                    ) : (
                      <span className="text-slate-400">unknown</span>
                    )
                  }
                />
                <Row label="Version" value={status.runtime.version || '—'} />
                <Row
                  label="Uptime"
                  value={`${formatDuration(status.runtime.uptimeSeconds)} (since ${new Date(
                    status.runtime.startedAt
                  ).toLocaleString()})`}
                />
                <Row label="Node" value={status.runtime.nodeVersion} />
                <Row
                  label="Database"
                  value={
                    <span className="font-mono text-xs">{status.runtime.database || 'unset'}</span>
                  }
                />
              </dl>
              {!status.runtime.commit && (
                <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                  Build the image with <code>GIT_COMMIT</code> set to confirm the running container
                  matches the code you deployed.
                </p>
              )}
            </SectionCard>
          </div>

          <SectionCard
            title={
              <>
                <Repeat className="h-4 w-4 text-brand-600" />
                Background jobs
              </>
            }
            trailing={
              <Badge
                tone={
                  status.sweeps.some((s) => s.status === 'failed' || s.stale)
                    ? 'warning'
                    : 'success'
                }
              >
                {status.sweeps.filter((s) => s.enabled).length} running
              </Badge>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="py-2 pr-3 font-medium">Job</th>
                    <th className="py-2 pr-3 font-medium">State</th>
                    <th className="py-2 pr-3 font-medium">Last run</th>
                    <th className="py-2 pr-3 font-medium">Took</th>
                    <th className="py-2 font-medium">Runs / failures</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {status.sweeps.map((sweep) => {
                    const tone: BadgeTone = !sweep.enabled
                      ? 'neutral'
                      : sweep.status === 'failed'
                        ? 'danger'
                        : sweep.stale
                          ? 'warning'
                          : sweep.status === 'ok'
                            ? 'success'
                            : 'neutral'
                    return (
                      <tr key={sweep.name} className="align-top">
                        <td className="py-2 pr-3 text-slate-800 dark:text-slate-200">
                          {sweep.label}
                          {sweep.lastError && (
                            <span className="mt-0.5 block break-words text-xs text-rose-600 dark:text-rose-400">
                              {sweep.lastError}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge tone={tone}>{sweep.stale ? 'overdue' : sweep.status}</Badge>
                        </td>
                        <td className="py-2 pr-3 text-slate-600 dark:text-slate-400">
                          {timeAgo(sweep.lastFinishedAt)}
                        </td>
                        <td className="py-2 pr-3 text-slate-600 dark:text-slate-400">
                          {sweep.lastDurationMs === null ? '—' : `${sweep.lastDurationMs}ms`}
                        </td>
                        <td className="py-2 text-slate-600 dark:text-slate-400">
                          {sweep.runs} / {sweep.failures}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              {status.scheduler.leaseHolder ? (
                <>
                  These jobs run on one instance at a time, currently{' '}
                  <span className="font-mono">{status.scheduler.leaseHolder}</span>
                  {status.scheduler.isLeader
                    ? ', which is the instance serving this page.'
                    : ' — not the instance serving this page, so the figures below are read from the database rather than from memory.'}
                </>
              ) : (
                <>No instance currently holds the scheduler lease.</>
              )}{' '}
              Counts are cumulative and survive restarts and failover.
            </p>
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title={
                <>
                  <Activity className="h-4 w-4 text-brand-600" />
                  Recorded activity
                </>
              }
              trailing={
                <Badge tone={status.activity.canary.silent ? 'warning' : 'success'}>
                  {status.activity.canary.silent ? 'Silent' : 'Active'}
                </Badge>
              }
            >
              {status.activity.error ? (
                <p className="text-sm text-rose-600 dark:text-rose-400">{status.activity.error}</p>
              ) : (
                <>
                  <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                    <Row label="Last recorded action" value={timeAgo(status.activity.lastEventAt)} />
                    <Row label="Last hour" value={`${status.activity.eventsLastHour} events`} />
                    <Row
                      label="Last 24 hours"
                      value={`${status.activity.eventsLast24h} events · ${status.activity.activeUsersLast24h} users`}
                    />
                  </dl>

                  {status.activity.canary.silent && (
                    <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                      Nothing recorded in the last {status.activity.canary.windowHours} hours on a
                      system that is normally in use. The API can answer requests while every
                      database-backed route fails, so treat this as a possible outage rather than a
                      quiet period.
                    </p>
                  )}

                  {status.activity.daily.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Last 14 days
                      </h3>
                      <ul className="mt-2 space-y-1">
                        {status.activity.daily.map((day) => {
                          const peak = Math.max(...status.activity.daily.map((d) => d.events), 1)
                          return (
                            <li key={day.date} className="flex items-center gap-2">
                              <span className="w-20 shrink-0 font-mono text-xs text-slate-500 dark:text-slate-400">
                                {day.date}
                              </span>
                              <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <span
                                  className="block h-full rounded-full bg-brand-500"
                                  style={{ width: `${Math.max(2, (day.events / peak) * 100)}%` }}
                                />
                              </span>
                              <span className="w-24 shrink-0 text-right text-xs text-slate-500 dark:text-slate-400">
                                {day.events} · {day.users}u
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                        Days with no recorded activity are absent from this list entirely.
                      </p>
                    </div>
                  )}
                </>
              )}
            </SectionCard>

            <SectionCard
              title={
                <>
                  <Plug className="h-4 w-4 text-brand-600" />
                  Integrations
                </>
              }
            >
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {status.integrations.map((integration) => (
                  <li
                    key={integration.key}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {integration.label}
                      {integration.detail && (
                        <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                          {integration.detail}
                        </span>
                      )}
                    </span>
                    <Badge tone={integration.configured ? 'success' : 'neutral'}>
                      {integration.configured ? 'Configured' : 'Off'}
                    </Badge>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                Reflects configuration only, not a live send. An "Off" channel explains silence
                without anyone reading environment variables on the host.
              </p>
            </SectionCard>

            <SectionCard
              title={
                <>
                  <Globe className="h-4 w-4 text-brand-600" />
                  Public site
                </>
              }
              trailing={
                status.publicSite.origin && (
                  <span className="truncate font-mono text-xs text-slate-400 dark:text-slate-500">
                    {status.publicSite.origin}
                  </span>
                )
              }
            >
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                <PublicSiteRow
                  label="TLS certificate"
                  state={status.publicSite.certificate.state}
                  detail={status.publicSite.certificate.detail}
                />
                <PublicSiteRow
                  label="Crawler access"
                  state={status.publicSite.robots.state}
                  detail={status.publicSite.robots.detail}
                />
              </ul>
              <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                Measured from outside, over the network, because neither of these is visible from
                inside the app — it answered every request normally while the certificate was
                expired and while robots.txt was telling search engines to drop the site. Cached
                for five minutes.
              </p>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  )
}
