/**
 * Operational status, collected in one place.
 *
 * Production once ran for three days while every case-touching query threw,
 * because `assessments.caseName` existed in schema.prisma and not in the
 * database. Nothing caught it: /health never touched the database, no container
 * carried a healthcheck, and an empty audit_logs table looks exactly like a
 * quiet week. The readiness probe, container healthchecks, and activity canary
 * that came out of that each answer one question, but only to whoever thinks to
 * curl them.
 *
 * This module is the answering service for all of them, so the admin System
 * Status page can show the whole picture at once. Everything here is read-only
 * and safe to call on demand. Most of it observes this process; the public-site
 * section is the exception, and probes the deployment from outside because what
 * it looks for is invisible from within.
 */

import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { isSmsConfigured } from './sms'
import { resolveEmailProvider } from './claims'
import { isConnectConfigured } from './amazon-connect'
import { isZoomConfigured } from './zoom'
import { isESignatureConfigured } from './esign'
import { isActivityCanaryEnabled } from './activity-canary-sweep'
import { getPublicSiteStatus, type PublicSiteStatus } from './public-site-status'
import {
  getSchedulerLeaseState,
  schedulerHolderId,
  type SchedulerLeaseState,
} from './scheduler-leader'
import { logger } from './logger'
import { ENV } from '../env'

const HOUR_MS = 60 * 60 * 1000

/** Worst-first, so callers can rank a list of component states. */
export type StatusLevel = 'down' | 'degraded' | 'ok'

function worst(levels: StatusLevel[]): StatusLevel {
  if (levels.includes('down')) return 'down'
  if (levels.includes('degraded')) return 'degraded'
  return 'ok'
}

// ---------------------------------------------------------------------------
// Readiness
// ---------------------------------------------------------------------------

export interface ReadinessProbe {
  name: string
  ok: boolean
  durationMs: number
  error?: string
}

export interface ReadinessResult {
  ok: boolean
  probes: ReadinessProbe[]
  failed: string[]
}

/**
 * The bare findFirst() calls are deliberate: with no `select`, Prisma emits
 * every scalar field of the model, so a column that exists in schema.prisma but
 * not in the database fails here rather than only in real traffic.
 */
export async function runReadinessProbes(): Promise<ReadinessResult> {
  const probes: [string, () => Promise<unknown>][] = [
    ['connection', () => prisma.$queryRaw`SELECT 1`],
    ['assessment', () => prisma.assessment.findFirst()],
    ['leadSubmission', () => prisma.leadSubmission.findFirst()],
    ['caseTask', () => prisma.caseTask.findFirst()],
    ['user', () => prisma.user.findFirst()],
  ]

  const results: ReadinessProbe[] = []
  for (const [name, run] of probes) {
    const startedAt = Date.now()
    try {
      await run()
      results.push({ name, ok: true, durationMs: Date.now() - startedAt })
    } catch (error) {
      results.push({
        name,
        ok: false,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const failed = results.filter((p) => !p.ok).map((p) => p.name)
  return { ok: failed.length === 0, probes: results, failed }
}

// ---------------------------------------------------------------------------
// Schema drift
// ---------------------------------------------------------------------------

export interface SchemaDriftResult {
  ok: boolean
  checkedTables: number
  missingTables: string[]
  missingColumns: { table: string; column: string }[]
  /** Tables in the database that no model maps to — leftovers, not failures. */
  unexpectedTables: string[]
  error?: string
}

/** Real tables that no Prisma model owns, so they are not drift. */
const UNMANAGED_TABLES = new Set([
  '_prisma_migrations',
  // connect-pg-simple creates this itself (createTableIfMissing).
  'user_sessions',
])

/**
 * Compare what the generated Prisma client believes about the database against
 * what the database actually has. The readiness probe covers five models; this
 * covers every one of them, and names the exact missing column instead of
 * leaving it to be discovered by a user hitting the route that selects it.
 */
export async function checkSchemaDrift(): Promise<SchemaDriftResult> {
  try {
    const rows = await prisma.$queryRaw<{ table_name: string; column_name: string }[]>`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
    `

    const actual = new Map<string, Set<string>>()
    for (const row of rows) {
      let columns = actual.get(row.table_name)
      if (!columns) {
        columns = new Set<string>()
        actual.set(row.table_name, columns)
      }
      columns.add(row.column_name)
    }

    const expectedTables = new Set<string>()
    const missingTables: string[] = []
    const missingColumns: { table: string; column: string }[] = []

    for (const model of Prisma.dmmf.datamodel.models) {
      const table = model.dbName || model.name
      expectedTables.add(table)

      const columns = actual.get(table)
      if (!columns) {
        missingTables.push(table)
        continue
      }

      for (const field of model.fields) {
        // Relations are not columns; their backing foreign keys are separate
        // scalar fields and get checked on their own.
        if (field.kind === 'object') continue
        const column = field.dbName || field.name
        if (!columns.has(column)) missingColumns.push({ table, column })
      }
    }

    const unexpectedTables = Array.from(actual.keys())
      .filter((table) => !expectedTables.has(table) && !UNMANAGED_TABLES.has(table))
      .sort()

    return {
      ok: missingTables.length === 0 && missingColumns.length === 0,
      checkedTables: expectedTables.size,
      missingTables: missingTables.sort(),
      missingColumns: missingColumns.sort((a, b) =>
        a.table === b.table ? a.column.localeCompare(b.column) : a.table.localeCompare(b.table)
      ),
      unexpectedTables,
    }
  } catch (error) {
    return {
      ok: false,
      checkedTables: 0,
      missingTables: [],
      missingColumns: [],
      unexpectedTables: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// ---------------------------------------------------------------------------
// Background sweeps
// ---------------------------------------------------------------------------

export type SweepStatus = 'ok' | 'failed' | 'running' | 'never' | 'disabled'

export interface SweepState {
  name: string
  label: string
  enabled: boolean
  intervalMs: number | null
  status: SweepStatus
  /** True when a sweep is overdue by more than one full interval. */
  stale: boolean
  lastStartedAt: string | null
  lastFinishedAt: string | null
  lastDurationMs: number | null
  lastError: string | null
  runs: number
  failures: number
}

interface SweepEntry {
  label: string
  enabled: boolean
  intervalMs: number | null
  startedAt: number | null
  finishedAt: number | null
  durationMs: number | null
  ok: boolean | null
  lastError: string | null
  runs: number
  failures: number
}

/**
 * Kept alongside the database copy because it is the only thing that knows a
 * sweep is *currently* running: the row is written when a run finishes, so
 * between start and finish the database still describes the previous run.
 */
const sweeps = new Map<string, SweepEntry>()

/**
 * Recording status must never be the reason a sweep fails, so every write here
 * is best-effort. A status page that is briefly stale is a much smaller problem
 * than a case-reminder run that aborts because it could not write a counter.
 */
function recordQuietly(operation: string, work: Promise<unknown>): void {
  void work.catch((error) => {
    logger.warn('Could not record sweep status', {
      operation,
      error: error instanceof Error ? error.message : String(error),
    })
  })
}

export function registerSweep(
  name: string,
  options: { label: string; enabled: boolean; intervalMs?: number | null }
): void {
  const existing = sweeps.get(name)
  sweeps.set(name, {
    label: options.label,
    enabled: options.enabled,
    intervalMs: options.intervalMs ?? null,
    startedAt: existing?.startedAt ?? null,
    finishedAt: existing?.finishedAt ?? null,
    durationMs: existing?.durationMs ?? null,
    ok: existing?.ok ?? null,
    lastError: existing?.lastError ?? null,
    runs: existing?.runs ?? 0,
    failures: existing?.failures ?? 0,
  })

  // Registration only happens on the instance that holds the lease, which is
  // what lets a standby describe jobs it is not running: the label, cadence and
  // enabled flag it renders are the leader's, read back from this row.
  recordQuietly(
    `register:${name}`,
    prisma.sweepRun.upsert({
      where: { name },
      create: {
        name,
        label: options.label,
        enabled: options.enabled,
        intervalMs: options.intervalMs ?? null,
        holder: schedulerHolderId(),
      },
      update: {
        label: options.label,
        enabled: options.enabled,
        intervalMs: options.intervalMs ?? null,
        holder: schedulerHolderId(),
      },
    })
  )
}

/**
 * Mark a sweep as started and hand back the two ways it can end. Callers keep
 * their own logging; this only records what the status page needs.
 */
export function beginSweep(name: string): { succeed: () => void; fail: (error: unknown) => void } {
  const entry = sweeps.get(name)
  if (!entry) {
    // A sweep that runs without registering still gets tracked, just unlabelled.
    registerSweep(name, { label: name, enabled: true })
  }
  const tracked = sweeps.get(name)!
  const startedAt = Date.now()
  tracked.startedAt = startedAt
  tracked.finishedAt = null

  const finish = (ok: boolean, error?: unknown) => {
    tracked.finishedAt = Date.now()
    tracked.durationMs = tracked.finishedAt - startedAt
    tracked.ok = ok
    tracked.runs += 1
    const message = ok ? null : error instanceof Error ? error.message : String(error)
    if (ok) {
      tracked.lastError = null
    } else {
      tracked.failures += 1
      tracked.lastError = message
    }

    // Counters are incremented in SQL rather than written from the value held
    // here, so they survive a restart and stay right if leadership moves
    // mid-run.
    recordQuietly(
      `finish:${name}`,
      prisma.sweepRun.update({
        where: { name },
        data: {
          holder: schedulerHolderId(),
          lastStartedAt: new Date(startedAt),
          lastFinishedAt: new Date(tracked.finishedAt!),
          lastDurationMs: tracked.durationMs,
          ok,
          lastError: message,
          runs: { increment: 1 },
          ...(ok ? {} : { failures: { increment: 1 } }),
        },
      })
    )
  }

  return {
    succeed: () => finish(true),
    fail: (error: unknown) => finish(false, error),
  }
}

function describe(
  name: string,
  entry: {
    label: string
    enabled: boolean
    intervalMs: number | null
    startedAt: number | null
    finishedAt: number | null
    durationMs: number | null
    ok: boolean | null
    lastError: string | null
    runs: number
    failures: number
  },
  now: number
): SweepState {
  let status: SweepStatus
  if (!entry.enabled) status = 'disabled'
  else if (entry.startedAt && !entry.finishedAt) status = 'running'
  else if (entry.ok === null) status = 'never'
  else status = entry.ok ? 'ok' : 'failed'

  // One full interval of grace before calling a sweep overdue, so a run
  // that merely started late does not read as a dead loop.
  const stale =
    entry.enabled &&
    entry.intervalMs !== null &&
    entry.finishedAt !== null &&
    now - entry.finishedAt > entry.intervalMs * 2

  return {
    name,
    label: entry.label,
    enabled: entry.enabled,
    intervalMs: entry.intervalMs,
    status,
    stale,
    lastStartedAt: entry.startedAt ? new Date(entry.startedAt).toISOString() : null,
    lastFinishedAt: entry.finishedAt ? new Date(entry.finishedAt).toISOString() : null,
    lastDurationMs: entry.durationMs,
    lastError: entry.lastError,
    runs: entry.runs,
    failures: entry.failures,
  }
}

/**
 * Read from the database so that an instance which is not running the sweeps
 * can still report on them, then overlaid with anything this process knows
 * that the row cannot express — currently only that a run is in flight, since
 * the row is written at the end of one.
 *
 * Falls back to the in-process view if the read fails. That is a worse answer
 * on a standby, where the map is empty, but the caller already reports a
 * database it cannot reach as down, so this will not be the only symptom.
 */
export async function getSweepStates(): Promise<SweepState[]> {
  const now = Date.now()

  let rows: Awaited<ReturnType<typeof prisma.sweepRun.findMany>> = []
  try {
    rows = await prisma.sweepRun.findMany()
  } catch (error) {
    logger.warn('Could not read sweep status; falling back to this process', {
      error: error instanceof Error ? error.message : String(error),
    })
    return Array.from(sweeps.entries())
      .map(([name, entry]) => describe(name, entry, now))
      .sort((a, b) => a.label.localeCompare(b.label))
  }

  const states = rows.map((row) => {
    const local = sweeps.get(row.name)
    const startedAt = row.lastStartedAt?.getTime() ?? null
    const finishedAt = row.lastFinishedAt?.getTime() ?? null

    // A run this process started but has not finished is newer than the row,
    // which still describes the run before it.
    const running = local && local.startedAt !== null && local.finishedAt === null

    return describe(
      row.name,
      {
        label: row.label,
        enabled: row.enabled,
        intervalMs: row.intervalMs,
        startedAt: running ? local!.startedAt : startedAt,
        finishedAt: running ? null : finishedAt,
        durationMs: row.lastDurationMs,
        ok: row.ok,
        lastError: row.lastError,
        runs: row.runs,
        failures: row.failures,
      },
      now
    )
  })

  // A sweep this process registered but never persisted — the write is
  // best-effort — would otherwise vanish from the page entirely.
  for (const [name, entry] of sweeps) {
    if (!states.some((state) => state.name === name)) {
      states.push(describe(name, entry, now))
    }
  }

  return states.sort((a, b) => a.label.localeCompare(b.label))
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export interface ActivitySnapshot {
  lastEventAt: string | null
  eventsLastHour: number
  eventsLast24h: number
  activeUsersLast24h: number
  daily: { date: string; events: number; users: number }[]
  canary: {
    enabled: boolean
    windowHours: number
    /** Enabled, has a baseline, and nothing recorded in the window. */
    silent: boolean
  }
  error?: string
}

const ACTIVITY_DAYS = 14

export async function getActivitySnapshot(): Promise<ActivitySnapshot> {
  const canaryWindowHours = (() => {
    const raw = Number(process.env.ACTIVITY_CANARY_WINDOW_HOURS)
    return Number.isFinite(raw) && raw >= 1 ? raw : 6
  })()

  const empty: ActivitySnapshot = {
    lastEventAt: null,
    eventsLastHour: 0,
    eventsLast24h: 0,
    activeUsersLast24h: 0,
    daily: [],
    canary: { enabled: isActivityCanaryEnabled(), windowHours: canaryWindowHours, silent: false },
  }

  try {
    const now = Date.now()
    const [lastEvent, eventsLastHour, eventsLast24h, eventsInCanaryWindow, activeUsers, daily] =
      await Promise.all([
        prisma.auditLog.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
        prisma.auditLog.count({ where: { createdAt: { gte: new Date(now - HOUR_MS) } } }),
        prisma.auditLog.count({ where: { createdAt: { gte: new Date(now - 24 * HOUR_MS) } } }),
        prisma.auditLog.count({
          where: { createdAt: { gte: new Date(now - canaryWindowHours * HOUR_MS) } },
        }),
        prisma.auditLog.findMany({
          where: { createdAt: { gte: new Date(now - 24 * HOUR_MS) }, userId: { not: null } },
          distinct: ['userId'],
          select: { userId: true },
        }),
        prisma.$queryRaw<{ day: Date; events: bigint; users: bigint }[]>`
          SELECT date_trunc('day', "createdAt")::date AS day,
                 count(*) AS events,
                 count(DISTINCT "userId") AS users
          FROM audit_logs
          WHERE "createdAt" >= ${new Date(now - ACTIVITY_DAYS * 24 * HOUR_MS)}
          GROUP BY 1
          ORDER BY 1 DESC
        `,
      ])

    // The canary only alerts once it has proof the deployment is used at all;
    // mirror that here so a fresh install does not show a red panel.
    const baseline =
      eventsInCanaryWindow > 0
        ? 1
        : await prisma.auditLog.count({
            where: { createdAt: { gte: new Date(now - 7 * 24 * HOUR_MS) } },
          })

    return {
      lastEventAt: lastEvent?.createdAt?.toISOString() ?? null,
      eventsLastHour,
      eventsLast24h,
      activeUsersLast24h: activeUsers.length,
      daily: daily.map((row) => ({
        date: new Date(row.day).toISOString().slice(0, 10),
        events: Number(row.events),
        users: Number(row.users),
      })),
      canary: {
        enabled: isActivityCanaryEnabled(),
        windowHours: canaryWindowHours,
        silent: isActivityCanaryEnabled() && eventsInCanaryWindow === 0 && baseline > 0,
      },
    }
  } catch (error) {
    return { ...empty, error: error instanceof Error ? error.message : String(error) }
  }
}

// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------

export interface RuntimeInfo {
  environment: string
  version: string | null
  /** Baked in at image build time; null means the build did not record one. */
  commit: string | null
  buildTime: string | null
  nodeVersion: string
  startedAt: string
  uptimeSeconds: number
  /** Host and database name only — never credentials. */
  database: string | null
}

function packageVersion(): string | null {
  try {
    // Resolves to api/package.json in dev and /app/package.json in the image.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../package.json').version ?? null
  } catch {
    return null
  }
}

/**
 * Which database this process is actually talking to. Worth showing plainly: a
 * redundant local Postgres container once ran alongside production, and
 * migrations and a seed both landed in the wrong one.
 */
function databaseTarget(): string | null {
  const raw = process.env.DATABASE_URL
  if (!raw) return null
  try {
    const url = new URL(raw)
    const port = url.port ? `:${url.port}` : ''
    return `${url.hostname}${port}${url.pathname}`
  } catch {
    return null
  }
}

export function getRuntimeInfo(): RuntimeInfo {
  const uptimeSeconds = Math.floor(process.uptime())
  return {
    environment: process.env.NODE_ENV || 'development',
    version: packageVersion(),
    commit: process.env.GIT_COMMIT || null,
    buildTime: process.env.BUILD_TIME || null,
    nodeVersion: process.version,
    startedAt: new Date(Date.now() - uptimeSeconds * 1000).toISOString(),
    uptimeSeconds,
    database: databaseTarget(),
  }
}

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

export interface IntegrationState {
  key: string
  label: string
  configured: boolean
  detail: string | null
}

/**
 * Presence of configuration only — never a secret, and never a live call. A
 * false here explains why a channel is silent without anyone reading env vars
 * on the box.
 */
export function getIntegrationStates(): IntegrationState[] {
  const emailProvider = resolveEmailProvider()
  const smsProvider = (process.env.SMS_PROVIDER || '').trim().toLowerCase() || 'auto'
  const llm = ENV.OPENAI_API_KEY
    ? 'OpenAI'
    : ENV.ANTHROPIC_API_KEY
      ? 'Anthropic'
      : null

  return [
    {
      key: 'email',
      label: 'Email',
      configured: emailProvider !== 'none',
      detail: emailProvider === 'none' ? 'No provider configured' : emailProvider.toUpperCase(),
    },
    { key: 'sms', label: 'SMS', configured: isSmsConfigured(), detail: smsProvider },
    { key: 'calls', label: 'Calls (Amazon Connect)', configured: isConnectConfigured(), detail: null },
    { key: 'zoom', label: 'Zoom', configured: isZoomConfigured(), detail: null },
    { key: 'esign', label: 'E-signature', configured: isESignatureConfigured(), detail: null },
    {
      key: 'payments',
      label: 'Payments (Stripe)',
      configured: Boolean(ENV.STRIPE_SECRET_KEY),
      detail: null,
    },
    { key: 'llm', label: 'AI model', configured: Boolean(llm), detail: llm },
  ]
}

// ---------------------------------------------------------------------------
// Composite
// ---------------------------------------------------------------------------

export interface SystemStatus {
  status: StatusLevel
  /** Plain-language reasons for anything below 'ok'. */
  issues: string[]
  checkedAt: string
  readiness: ReadinessResult
  schema: SchemaDriftResult
  sweeps: SweepState[]
  /** Which instance owns the background sweeps, and whether that is decidable. */
  scheduler: SchedulerLeaseState
  activity: ActivitySnapshot
  runtime: RuntimeInfo
  integrations: IntegrationState[]
  publicSite: PublicSiteStatus
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const [readiness, schema, activity, publicSite, sweeps] = await Promise.all([
    runReadinessProbes(),
    checkSchemaDrift(),
    getActivitySnapshot(),
    getPublicSiteStatus(),
    getSweepStates(),
  ])
  const scheduler = getSchedulerLeaseState()
  const issues: string[] = []
  const levels: StatusLevel[] = []

  // Sweep state is read from the database, so this instance reports on jobs it
  // may not be running itself. What it cannot infer that way is whether *any*
  // instance is running them: rows persist after the last leader stops. Only
  // the lease answers that, so check it first.
  if (scheduler.consecutiveFailures > 0 && !scheduler.everAcquired) {
    levels.push('down')
    issues.push(
      `No instance is running the background jobs: the scheduler lease cannot be read (${scheduler.lastError}).`
    )
  } else if (scheduler.consecutiveFailures > 0) {
    levels.push('degraded')
    issues.push(`Scheduler lease check is failing (${scheduler.lastError}); jobs may have moved instance.`)
  }

  if (!readiness.ok) {
    levels.push('down')
    issues.push(`Readiness probe failing: ${readiness.failed.join(', ')}.`)
  }

  if (schema.error) {
    levels.push('degraded')
    issues.push('Could not compare the database against schema.prisma.')
  } else if (!schema.ok) {
    levels.push('down')
    const parts: string[] = []
    if (schema.missingTables.length > 0) parts.push(`${schema.missingTables.length} table(s)`)
    if (schema.missingColumns.length > 0) parts.push(`${schema.missingColumns.length} column(s)`)
    issues.push(`Database is missing ${parts.join(' and ')} that the API expects.`)
  }

  const failedSweeps = sweeps.filter((s) => s.status === 'failed')
  if (failedSweeps.length > 0) {
    levels.push('degraded')
    issues.push(`Background job failing: ${failedSweeps.map((s) => s.label).join(', ')}.`)
  }

  const staleSweeps = sweeps.filter((s) => s.stale)
  if (staleSweeps.length > 0) {
    levels.push('degraded')
    issues.push(`Background job overdue: ${staleSweeps.map((s) => s.label).join(', ')}.`)
  }

  if (activity.error) {
    levels.push('degraded')
    issues.push('Could not read recent activity.')
  } else if (activity.canary.silent) {
    levels.push('degraded')
    issues.push(
      `No recorded activity in the last ${activity.canary.windowHours}h on a system that is normally in use.`
    )
  }

  // Expiry and a sitewide Disallow are user-visible failures the API cannot
  // see from the inside, so they are stated in the terms of the damage rather
  // than the mechanism. A probe that could not reach the origin is reported as
  // not knowing, which is a weaker claim than knowing something is wrong.
  const { certificate, robots } = publicSite

  if (certificate.state === 'fail') {
    const expired = certificate.daysRemaining !== null && certificate.daysRemaining < 0
    levels.push(expired ? 'down' : 'degraded')
    issues.push(
      expired
        ? 'TLS certificate has expired — browsers are refusing the public site.'
        : `Could not check the TLS certificate: ${certificate.detail}`
    )
  } else if (certificate.state === 'warn') {
    levels.push('degraded')
    issues.push(`TLS certificate expires in ${certificate.daysRemaining} day(s) and has not renewed.`)
  }

  if (robots.state === 'fail' || robots.state === 'warn') {
    levels.push('degraded')
    issues.push(`robots.txt: ${robots.detail}`)
  }

  return {
    status: worst(levels),
    issues,
    checkedAt: new Date().toISOString(),
    readiness,
    schema,
    sweeps,
    scheduler,
    activity,
    runtime: getRuntimeInfo(),
    integrations: getIntegrationStates(),
    publicSite,
  }
}
