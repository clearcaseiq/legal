import { useEffect, useRef } from 'react'

// Two refreshes triggered by the same alt-tab (both `focus` and
// `visibilitychange` fire) should not become two requests.
const MIN_REFRESH_GAP_MS = 5000

/**
 * Poll while the tab is visible, and refresh as soon as it becomes visible again.
 *
 * The notification bells each ran a bare `setInterval`, which meant a user who
 * came back to a background tab kept looking at a stale badge until the next
 * tick — up to a full interval later, and longer in practice because browsers
 * throttle timers in hidden tabs. Nothing forced a fetch on return.
 *
 * So the interval is suspended while hidden (nobody is looking, and the timer is
 * unreliable there anyway) and resumed with an immediate refresh, which is what
 * makes a notification appear on the user's terms rather than the timer's.
 *
 * This narrows the window; it does not close it. While the tab stays open and
 * focused a notification still waits up to `intervalMs`. Only a server-pushed
 * transport removes that, and there is no realtime transport in the stack today.
 */
export function useVisibilityPoll(callback: () => void, intervalMs: number) {
  const savedCallback = useRef(callback)
  savedCallback.current = callback
  const lastRunAt = useRef(0)

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null

    const run = () => {
      lastRunAt.current = Date.now()
      savedCallback.current()
    }
    const runIfStale = () => {
      if (Date.now() - lastRunAt.current >= MIN_REFRESH_GAP_MS) run()
    }

    const start = () => {
      if (timer === null) timer = setInterval(run, intervalMs)
    }
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer)
        timer = null
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        runIfStale()
        start()
      } else {
        stop()
      }
    }

    run()
    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [intervalMs])
}
