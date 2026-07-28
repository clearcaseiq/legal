/**
 * The public base URL of the web app, resolved in exactly one place.
 *
 * Links built here are the ones that reach people outside the system: password
 * resets, booking pages, document-upload requests. Getting the host wrong does
 * not raise an error, it sends a customer somewhere that does not exist.
 *
 * This module exists because that happened. Nineteen call sites each rebuilt the
 * base URL inline and disagreed in three separate ways:
 *
 *   - Some read `WEB_URL`, some read `APP_URL`/`FRONTEND_URL`, and five read the
 *     latter two *only* — so setting `WEB_URL` correctly still emitted localhost
 *     links for document requests.
 *   - Some fell back to `https://www.clearcaseiq.com`, others to
 *     `https://app.clearcaseiq.com`, so links pointed at two different hosts.
 *   - Most fell back to `http://localhost:3000`, which is a valid-looking string
 *     that silently ships to production.
 *
 * There is deliberately no hardcoded production fallback. A misconfigured
 * deployment must fail loudly at boot rather than guess a hostname.
 */

// Imported for the dotenv side effect only. `process.env` is read at call time
// rather than captured, so tests can vary configuration per case.
import '../env'

/**
 * Accepted variable names, most canonical first.
 *
 * `WEB_URL` is the documented name and the one CORS reads. The other two are
 * retained because existing deployments set them, but they are aliases, not
 * separate settings.
 */
const URL_VARS = ['WEB_URL', 'APP_URL', 'FRONTEND_URL'] as const

const DEV_FALLBACK = 'http://localhost:3000'

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

function normalize(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function firstConfigured(): { name: string; value: string } | null {
  for (const name of URL_VARS) {
    const raw = process.env[name]
    if (raw && raw.trim()) return { name, value: normalize(raw) }
  }
  return null
}

function isLoopback(value: string): boolean {
  try {
    const { hostname } = new URL(value)
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  } catch {
    return false
  }
}

/**
 * The web app base URL, with no trailing slash.
 *
 * Throws in production when unset or pointed at loopback, because a link to
 * localhost in an email is worse than a failed request: nobody finds out until a
 * customer reports it.
 */
export function webBaseUrl(): string {
  const configured = firstConfigured()

  if (!configured) {
    if (isProduction()) {
      throw new Error(
        `WEB_URL must be configured in production; it is the base of every link sent to users. ` +
          `Accepted aliases: ${URL_VARS.join(', ')}.`
      )
    }
    return DEV_FALLBACK
  }

  if (isProduction() && isLoopback(configured.value)) {
    throw new Error(
      `${configured.name} points at ${configured.value}, which is unreachable for anyone ` +
        `receiving a link. Set it to the public web address.`
    )
  }

  return configured.value
}

/**
 * An absolute URL into the web app.
 *
 * `path` is expected to be root-relative; a missing leading slash is tolerated so
 * callers cannot accidentally concatenate host and path.
 */
export function webUrl(path: string): string {
  const base = webBaseUrl()
  if (!path) return base
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Validate configuration at startup so a bad deploy fails immediately rather
 * than when the first email goes out.
 *
 * Returns a warning when the aliases disagree. That is not fatal — one of them
 * still wins deterministically — but it is always a mistake worth surfacing.
 */
export function checkWebBaseUrl(): { baseUrl: string; warning?: string } {
  const baseUrl = webBaseUrl()

  const distinct = new Set(
    URL_VARS.map((name) => process.env[name])
      .filter((value): value is string => Boolean(value && value.trim()))
      .map(normalize)
  )

  if (distinct.size > 1) {
    return {
      baseUrl,
      warning:
        `${URL_VARS.filter((n) => process.env[n]).join(', ')} are set to different values ` +
        `(${Array.from(distinct).join(', ')}). Using ${baseUrl}. These are aliases for one ` +
        `setting; leave only WEB_URL set.`,
    }
  }

  return { baseUrl }
}
