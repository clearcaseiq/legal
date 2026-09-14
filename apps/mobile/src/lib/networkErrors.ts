/**
 * Classifying a failed request, kept apart from `./api`.
 *
 * These two predicates decide whether an attorney's action may be sent a second
 * time, which makes them worth testing directly — and `./api` cannot be loaded
 * in a test, because it reads the React Native `__DEV__` global and builds an
 * axios client at module scope. Nothing here touches React Native.
 *
 * `./api` re-exports both, so callers import from wherever reads better.
 */
import { isAxiosError, type AxiosError } from 'axios'

/**
 * True when an error looks like a connectivity failure (no server response), as
 * opposed to a 4xx/5xx the server actually returned.
 *
 * Suitable for deciding what to tell the user. NOT suitable for deciding whether
 * to replay a write — see `isUnsentRequestError`.
 */
export function isOfflineError(err: unknown): boolean {
  if (!isAxiosError(err)) return false
  const e = err as AxiosError
  if (e.response) return false
  const msg = (e.message || '').toLowerCase()
  return (
    e.code === 'ERR_NETWORK' ||
    e.code === 'ECONNABORTED' ||
    msg.includes('network error') ||
    msg.includes('timeout')
  )
}

/**
 * True only when the request cannot have reached the server.
 *
 * Deliberately narrower than `isOfflineError`, and the difference is the whole
 * safety argument for replaying an action. A timeout is ambiguous: the server
 * may well have accepted the lead or delivered the message and only the response
 * was lost, so re-sending on a timeout does it twice. A connection that never
 * opened cannot have been processed, so that one is safe to queue.
 *
 * The queue pays for this with the occasional action it refuses to retry. That
 * is the right way round — the attorney sees a real failure and decides, rather
 * than the app silently accepting a case on their behalf a second time.
 */
export function isUnsentRequestError(err: unknown): boolean {
  if (!isAxiosError(err)) return false
  const e = err as AxiosError
  if (e.response) return false
  if (e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT') return false
  const msg = (e.message || '').toLowerCase()
  if (msg.includes('timeout')) return false
  return e.code === 'ERR_NETWORK' || msg.includes('network error')
}
