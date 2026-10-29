import { getApiOrigin } from './runtimeEnv'

/**
 * Browser error reporting to Sentry. The DSN comes from the API at runtime
 * (/v1/client-config) so the web image stays promotable between QA and
 * production, and the SDK is a separate chunk that is only fetched when a DSN
 * is configured.
 *
 * Events carry the error, stack and route path only: query strings, fragments,
 * console output and user details are removed before sending, because URLs and
 * logs here can carry claimant contact and case details.
 */

type SentryModule = typeof import('@sentry/react')
type SentryEvent = import('@sentry/react').ErrorEvent
type SentryBreadcrumb = import('@sentry/react').Breadcrumb

type ClientConfig = {
  sentry: { dsn: string; environment: string; release: string | null } | null
}

const MAX_QUEUED = 10

let sentry: SentryModule | null = null
let started = false
let settled = false
let queue: Array<{ error: unknown; context?: Record<string, unknown> }> = []

export function stripUrl(url: unknown): unknown {
  return typeof url === 'string' ? url.split(/[?#]/)[0] : url
}

export function scrubEvent(event: SentryEvent): SentryEvent {
  delete event.user
  if (event.request) {
    delete event.request.cookies
    delete event.request.query_string
    delete event.request.data
    event.request.url = stripUrl(event.request.url) as string | undefined
    if (event.request.headers) {
      const userAgent = event.request.headers['User-Agent'] ?? event.request.headers['user-agent']
      event.request.headers = userAgent ? { 'User-Agent': userAgent } : {}
    }
  }
  return event
}

export function scrubBreadcrumb(breadcrumb: SentryBreadcrumb): SentryBreadcrumb | null {
  if (breadcrumb.category === 'console' || breadcrumb.category === 'ui.input') return null
  if (breadcrumb.data) {
    const data = { ...breadcrumb.data }
    for (const key of ['url', 'from', 'to']) {
      if (key in data) data[key] = stripUrl(data[key])
    }
    breadcrumb.data = data
  }
  return breadcrumb
}

function capture(Sentry: SentryModule, error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, context ? { extra: context } : undefined)
}

export async function initErrorReporting(): Promise<void> {
  if (started || typeof window === 'undefined') return
  started = true
  try {
    const res = await fetch(`${getApiOrigin()}/v1/client-config`, { credentials: 'omit' })
    if (!res.ok) return
    const config = (await res.json()) as ClientConfig
    if (!config.sentry?.dsn) return

    const Sentry = await import('@sentry/react')
    Sentry.init({
      dsn: config.sentry.dsn,
      environment: config.sentry.environment,
      release: config.sentry.release ?? undefined,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      beforeSend: scrubEvent,
      beforeBreadcrumb: scrubBreadcrumb,
    })
    sentry = Sentry
    for (const item of queue) capture(Sentry, item.error, item.context)
  } catch {
    // Reporting is best effort and must never break the page.
  } finally {
    settled = true
    queue = []
  }
}

/** For errors React catches in an error boundary, which never reach window.onerror. */
export function reportUiError(error: unknown, context?: Record<string, unknown>): void {
  if (sentry) {
    capture(sentry, error, context)
    return
  }
  if (started && !settled && queue.length < MAX_QUEUED) queue.push({ error, context })
}
