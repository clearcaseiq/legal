/**
 * Error-rate tripwire.
 *
 * The platform had no error reporting at all — no Sentry, no APM, no metric
 * filter. An unhandled 500 was logged to stdout and that was the end of it, so
 * the only way to learn production was failing was for someone to be reading
 * `docker logs` at the moment it scrolled past. The activity canary catches a
 * total outage, but a route that 500s on every request while the rest of the app
 * keeps writing audit rows looks perfectly healthy to it.
 *
 * This closes that gap using what is already here: an in-process counter and the
 * same `notifyAdmins` path the canary uses. It is deliberately not a metrics
 * backend — it answers one question, "is the API throwing far more than usual",
 * and mails someone when the answer is yes.
 *
 * Two known limits, both acceptable for a single-instance deployment and both
 * worth revisiting before scaling out:
 *  - State is per-process, so N instances mean N independent counters and up to N
 *    alerts per incident. The same is already true of the activity canary.
 *  - A restart clears the window, which is the safe direction: it re-arms rather
 *    than suppressing.
 */

import { logger } from './logger'
import { notifyAdmins } from './platform-notifications'

const MINUTE_MS = 60 * 1000

/**
 * Hard ceiling on retained samples. A sustained outage could otherwise grow this
 * array without bound between sweeps, turning an incident into a memory problem.
 */
const MAX_SAMPLES = 5000

type ErrorSample = { at: number; label: string }

let samples: ErrorSample[] = []
let lastAlertAt: number | null = null

function numberFromEnv(name: string, fallback: number, min: number): number {
  const raw = Number(process.env[name])
  return Number.isFinite(raw) && raw >= min ? raw : fallback
}

export function isErrorRateMonitorEnabled(): boolean {
  return process.env.ERROR_ALERT_ENABLED !== 'false'
}

/**
 * Record one server-side failure.
 *
 * `label` is used to name the most common failure in the alert, so it must not
 * carry request-specific detail — no IDs, no user input, no message fragments
 * that might contain PII. The error's constructor name and the route pattern are
 * the right granularity.
 */
export function recordServerError(label: string): void {
  if (!isErrorRateMonitorEnabled()) return

  samples.push({ at: Date.now(), label })
  if (samples.length > MAX_SAMPLES) {
    samples = samples.slice(-MAX_SAMPLES)
  }
}

export interface ErrorRateSweepResult {
  windowMinutes: number
  errorsInWindow: number
  threshold: number
  alerted: boolean
  skipped?: boolean
  reason?: string
}

export async function runErrorRateSweep(): Promise<ErrorRateSweepResult> {
  const windowMinutes = numberFromEnv('ERROR_ALERT_WINDOW_MINUTES', 15, 1)
  const threshold = numberFromEnv('ERROR_ALERT_THRESHOLD', 25, 1)
  const cooldownMinutes = numberFromEnv('ERROR_ALERT_COOLDOWN_MINUTES', 60, 1)
  const now = Date.now()

  if (!isErrorRateMonitorEnabled()) {
    return { windowMinutes, errorsInWindow: 0, threshold, alerted: false, skipped: true, reason: 'Disabled by env' }
  }

  const cutoff = now - windowMinutes * MINUTE_MS
  samples = samples.filter((sample) => sample.at >= cutoff)
  const errorsInWindow = samples.length

  if (errorsInWindow < threshold) {
    return { windowMinutes, errorsInWindow, threshold, alerted: false }
  }

  if (lastAlertAt !== null && now - lastAlertAt < cooldownMinutes * MINUTE_MS) {
    return {
      windowMinutes,
      errorsInWindow,
      threshold,
      alerted: false,
      skipped: true,
      reason: 'Within alert cooldown',
    }
  }

  const counts = new Map<string, number>()
  for (const sample of samples) {
    counts.set(sample.label, (counts.get(sample.label) || 0) + 1)
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  logger.error('Error rate above threshold', { errorsInWindow, windowMinutes, threshold })

  await notifyAdmins({
    subject: `ClearCaseIQ: ${errorsInWindow} server errors in ${windowMinutes} minutes`,
    message: [
      `The API has returned ${errorsInWindow} server errors in the last ${windowMinutes} minutes, against an alert threshold of ${threshold}.`,
      '',
      'Most frequent:',
      ...top.map(([label, count]) => `  ${count}x  ${label}`),
      '',
      'Check /health/ready for database reachability, then the API container logs for the full stack traces (search the request IDs).',
    ].join('\n'),
    metadata: {
      eventType: 'ops.error_rate',
      errorsInWindow,
      windowMinutes,
      threshold,
    },
  })

  lastAlertAt = now
  return { windowMinutes, errorsInWindow, threshold, alerted: true }
}

/** Test seam. */
export function resetErrorRateMonitorForTests(): void {
  samples = []
  lastAlertAt = null
}
