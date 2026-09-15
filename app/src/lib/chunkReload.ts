/**
 * Recovering from a chunk that no longer exists.
 *
 * Every route is a `React.lazy` import, and webpack names the resulting files
 * with a per-build id. A deploy therefore deletes the exact files any already
 * open tab is still expecting, and the next navigation rejects with
 * `ChunkLoadError: Loading chunk 8558 failed`. Next has its own recovery for
 * this, but it only covers its own router — these routes are react-router
 * inside a Next shell, so the rejection goes to the React error boundary and
 * stops there.
 *
 * The boundary's "Try again" cannot fix it either: `React.lazy` caches the
 * rejected promise, so re-rendering re-throws the same failure forever. Only a
 * document reload can, because that is what fetches HTML referencing chunks
 * that exist.
 *
 * Reloading on an error is a loop risk, which is the whole reason for the
 * timestamp. One reload is a fix; a second within seconds means the reload did
 * not help and something else is wrong, and spinning on it would be worse than
 * the error screen.
 */

const ATTEMPT_KEY = 'chunk_reload_attempt'

/**
 * How long a reload has to "stick" before we would try again.
 *
 * Long enough that a failure immediately after reloading is recognised as the
 * reload having failed, short enough that a deploy later in the same tab's life
 * still gets its own recovery rather than being written off.
 */
const RETRY_WINDOW_MS = 10_000

/**
 * Whether this error means "the code you asked for is gone", as opposed to a
 * genuine bug in a component.
 *
 * Matched on text because the useful signal is spread across bundlers and
 * browsers: webpack raises a named `ChunkLoadError`, while native ESM failures
 * surface only as a message, and Safari words its differently from Chrome.
 * Over-matching here costs one unnecessary reload; under-matching leaves the
 * dead end this exists to remove.
 */
export function isChunkLoadError(error: { name?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  if (error.name === 'ChunkLoadError') return true

  const message = error.message || ''
  return (
    /loading chunk \S+ failed/i.test(message) ||
    /loading css chunk \S+ failed/i.test(message) ||
    /failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /importing a module script failed/i.test(message)
  )
}

/**
 * Whether to reload the document now, recording the attempt if so.
 *
 * Deliberately impure in one respect — it writes the attempt before returning
 * true — so that the decision and the record of it cannot come apart. A caller
 * that reloaded without recording would loop.
 */
export function shouldReloadForChunkError(
  error: { name?: string; message?: string } | null | undefined,
  now: number,
  storage: Pick<Storage, 'getItem' | 'setItem'>,
): boolean {
  if (!isChunkLoadError(error)) return false

  try {
    const previous = Number(storage.getItem(ATTEMPT_KEY))
    if (Number.isFinite(previous) && previous > 0 && now - previous < RETRY_WINDOW_MS) {
      return false
    }
    storage.setItem(ATTEMPT_KEY, String(now))
    return true
  } catch {
    // Storage can throw outright in private modes and with cookies blocked.
    // Without somewhere to record the attempt there is no way to bound the
    // loop, so the error screen is the safer outcome.
    return false
  }
}
