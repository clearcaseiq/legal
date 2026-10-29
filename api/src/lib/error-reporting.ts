/**
 * Error reporting to Sentry, so a failure on any host reaches one place instead
 * of scrolling past in that host's `docker logs`.
 *
 * Off unless SENTRY_DSN is set. The SDK is required lazily so every test file
 * that imports the logger does not pay for loading it.
 *
 * This platform holds medical and case facts, so events are stripped to the
 * error, its stack, the route and opaque ids before they leave the process:
 * no request bodies, cookies, auth headers, query strings, IPs or user records.
 * Sentry's own server-side scrubbing is a second layer, not the first.
 */

type SentryModule = typeof import('@sentry/node')
type SentryEvent = import('@sentry/node').ErrorEvent
type SentryBreadcrumb = import('@sentry/node').Breadcrumb

let sentry: SentryModule | null = null

/** Context keys safe to forward: opaque identifiers and operational labels. */
const SAFE_CONTEXT_KEY = /(^|[a-z])(id|Id|ID|ids|Ids)$|^(trigger|reason|status|code|route|method|scope|kind|action|requestId|sweep)$/

const KEPT_HEADERS = new Set(['user-agent', 'content-type', 'x-request-id'])

function stripQuery(url: unknown): unknown {
  return typeof url === 'string' ? url.split('?')[0] : url
}

export function scrubEvent(event: SentryEvent): SentryEvent {
  delete event.user
  if (event.request) {
    delete event.request.data
    delete event.request.cookies
    delete event.request.query_string
    event.request.url = stripQuery(event.request.url) as string | undefined
    if (event.request.headers) {
      event.request.headers = Object.fromEntries(
        Object.entries(event.request.headers).filter(([name]) => KEPT_HEADERS.has(name.toLowerCase())),
      )
    }
  }
  return event
}

export function scrubBreadcrumb(breadcrumb: SentryBreadcrumb): SentryBreadcrumb | null {
  if (breadcrumb.category === 'console') return null
  if (breadcrumb.data && 'url' in breadcrumb.data) {
    breadcrumb.data = { ...breadcrumb.data, url: stripQuery(breadcrumb.data.url) }
  }
  return breadcrumb
}

export function safeContext(context: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!context) return {}
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(context)) {
    if (!SAFE_CONTEXT_KEY.test(key)) continue
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value
    }
  }
  return out
}

export function initErrorReporting(): boolean {
  if (sentry) return true
  const dsn = process.env.SENTRY_DSN?.trim()
  if (!dsn) return false

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Sentry: SentryModule = require('@sentry/node')
  Sentry.init({
    dsn,
    environment: process.env.DEPLOY_ENV || process.env.NODE_ENV || 'development',
    release: process.env.GIT_COMMIT || undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    // index.ts owns process crash handling; Sentry's versions would report each
    // crash a second time and change when the process exits.
    integrations: (defaults) =>
      defaults.filter((i) => i.name !== 'OnUncaughtException' && i.name !== 'OnUnhandledRejection'),
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  })
  sentry = Sentry
  return true
}

export function isErrorReportingEnabled(): boolean {
  return sentry !== null
}

/**
 * `message` is the log line ("Failed to list platform payments"), used to group
 * events, so a route that catches its own error and returns 500 still reports
 * as itself rather than as a generic Error.
 */
export function reportError(error: unknown, message?: string, context?: Record<string, unknown>): void {
  if (!sentry) return
  try {
    const extra = safeContext(context)
    if (error instanceof Error) {
      sentry.captureException(error, {
        extra,
        tags: message ? { log_message: message.slice(0, 200) } : undefined,
        fingerprint: message ? ['{{ default }}', message] : undefined,
      })
    } else {
      sentry.captureMessage(message || String(error), { level: 'error', extra })
    }
  } catch {
    // Reporting must never be the thing that breaks a request.
  }
}

export async function flushErrorReporting(timeoutMs = 2000): Promise<void> {
  if (!sentry) return
  try {
    await sentry.flush(timeoutMs)
  } catch {
    // Shutting down regardless.
  }
}
