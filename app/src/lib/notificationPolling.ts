/**
 * How often the notification bells re-check for new activity.
 *
 * The backend writes most notifications synchronously, in milliseconds, so this
 * interval — not delivery — was the dominant delay in a notification reaching
 * someone: at 60s the average wait was 30s for news that already existed.
 *
 * 30s halves that, and pairing it with `useVisibilityPoll` means a returning tab
 * refreshes immediately rather than waiting out the tick, which is the case that
 * felt worst. It is deliberately not lower: the plaintiff unread-count endpoint
 * builds the full feed before counting it, so these polls are not free, and
 * every signed-in session runs several bells at once.
 *
 * Shortening this further is the wrong lever. Genuinely realtime delivery needs
 * a server push (SSE or WebSocket), which the deployment cannot carry yet — the
 * nginx API location sends no Upgrade headers and there is no pub/sub backplane
 * shared between the two instances behind the load balancer.
 */
export const NOTIFICATION_POLL_MS = 30_000

/**
 * Message threads, which read as a conversation and so tolerate less lag than a
 * bell. Cheaper per call, since it is an unread summary rather than a feed.
 */
export const MESSAGE_POLL_MS = 20_000
