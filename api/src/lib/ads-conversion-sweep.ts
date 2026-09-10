/**
 * Reports retained cases back to Google Ads as offline conversions.
 *
 * Runs as a sweep rather than firing inline when a case is retained, for three
 * reasons. Retention is written from three separate places — the e-sign
 * webhook, the attorney dashboard's status change, and the outcome report — and
 * a sweep covers all of them without any of them knowing about advertising. An
 * upload to a third party must never be able to fail a retention. And a sweep
 * is naturally retryable, which matters when the dependency is someone else's
 * API.
 *
 * What leaves this process is a click id, a timestamp and a projected revenue
 * figure. No claim detail, no contact details, no diagnosis, nothing about the
 * case itself. That constraint is the reason the loop is closed this way at all
 * instead of with a conversion tag on the results page.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import {
  isGoogleAdsConfigured,
  uploadClickConversions,
  type ClickConversion,
} from './google-ads-conversions'
import { buildRevenueProjection } from './revenue-projection'

/**
 * Ads will not accept a conversion whose click is older than the conversion
 * window on the action, and 90 days is the maximum that window can be set to.
 * Anything past it is rejected no matter how many times it is sent, so those
 * are marked skipped rather than retried forever.
 *
 * This is a real limit on what can be measured, not a tuning knob: a case that
 * takes longer than 90 days from ad click to signed retainer cannot be reported
 * to Ads at all.
 */
export const CLICK_WINDOW_DAYS = 90

/**
 * Ads accepts up to 2000 conversions per request. Far smaller here because the
 * volume does not need it and a smaller batch means a transient failure costs
 * less work.
 */
const BATCH_SIZE = 50

/**
 * Given up on after this many tries. Bounded so a permanently rejected
 * conversion — a deleted conversion action, a malformed click id — stops
 * consuming a slot in every sweep forever.
 */
export const MAX_ATTEMPTS = 5

export interface AdsConversionSweepResult {
  /** Retained cases newly found to have a click id worth reporting. */
  discovered: number
  attempted: number
  uploaded: number
  failed: number
  /** Terminal non-failures, almost always a click outside its window. */
  skipped: number
}

const EMPTY: AdsConversionSweepResult = {
  discovered: 0,
  attempted: 0,
  uploaded: 0,
  failed: 0,
  skipped: 0,
}

/**
 * Find retained cases whose intake lead carried a Google Ads click id and that
 * have not been recorded yet.
 *
 * The row is written before any upload is attempted, so a crash mid-flight
 * leaves a pending record to retry rather than a conversion that silently never
 * happened. `assessmentId` is unique on both sides of this join, so the
 * relationship is one case to one lead to at most one conversion.
 */
async function discover(): Promise<number> {
  const retained = await prisma.leadSubmission.findMany({
    where: { status: 'retained', convertedAt: { not: null } },
    select: { assessmentId: true, convertedAt: true },
    orderBy: { convertedAt: 'desc' },
    take: BATCH_SIZE * 4,
  })
  if (!retained.length) return 0

  const assessmentIds = retained.map((lead) => lead.assessmentId)

  const [leads, existing] = await Promise.all([
    prisma.intakeLead.findMany({
      where: { assessmentId: { in: assessmentIds }, gclid: { not: null } },
      select: { assessmentId: true, gclid: true },
    }),
    prisma.adsConversionUpload.findMany({
      where: { assessmentId: { in: assessmentIds } },
      select: { assessmentId: true },
    }),
  ])

  const alreadyRecorded = new Set(existing.map((row) => row.assessmentId))
  const convertedAt = new Map(retained.map((lead) => [lead.assessmentId, lead.convertedAt as Date]))

  // `assessmentId` and `gclid` are both nullable on IntakeLead, and the query
  // above already excludes rows where either is null. Narrowing here rather
  // than asserting keeps that guarantee checked instead of assumed.
  const clickIds = new Map<string, string>()
  for (const lead of leads) {
    if (lead.assessmentId && lead.gclid) clickIds.set(lead.assessmentId, lead.gclid)
  }

  let discovered = 0

  for (const [assessmentId, gclid] of clickIds) {
    if (alreadyRecorded.has(assessmentId)) continue

    const converted = convertedAt.get(assessmentId)
    if (!converted) continue

    // Projected fee revenue, so Ads bids on what the case is worth to us rather
    // than treating every retention as identical. Null when the case has no
    // prediction, which uploads the conversion without a value rather than
    // asserting it is worth nothing.
    const projection = await buildRevenueProjection(assessmentId)

    try {
      await prisma.adsConversionUpload.create({
        data: {
          assessmentId,
          gclid,
          value: projection?.projectedFeeRevenue ?? null,
          convertedAt: converted,
          status: 'pending',
        },
      })
      discovered += 1
    } catch (error) {
      // The unique constraint on assessmentId is the dedup guarantee, and two
      // instances racing here is exactly what it is for. Losing that race is
      // the correct outcome, not an error worth reporting.
      logger.debug('Ads conversion already recorded for assessment', { assessmentId, error })
    }
  }

  return discovered
}

/** Whether the click is still inside the window Ads will accept. */
function withinClickWindow(convertedAt: Date, now: number): boolean {
  return now - convertedAt.getTime() <= CLICK_WINDOW_DAYS * 24 * 60 * 60_000
}

/**
 * Record retained cases with Google Ads. Never throws.
 *
 * A failure here must not take the background loop down with it: the loop also
 * runs sweeps that people depend on, and an advertising integration is the
 * least important thing in it.
 */
export async function runAdsConversionSweep(): Promise<AdsConversionSweepResult> {
  if (!isGoogleAdsConfigured()) return EMPTY

  const discovered = await discover()

  const pending = await prisma.adsConversionUpload.findMany({
    where: { status: 'pending', attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { convertedAt: 'asc' },
    take: BATCH_SIZE,
  })
  if (!pending.length) return { ...EMPTY, discovered }

  const now = Date.now()
  const stale = pending.filter((row) => !withinClickWindow(row.convertedAt, now))
  const sendable = pending.filter((row) => withinClickWindow(row.convertedAt, now))

  if (stale.length) {
    await prisma.adsConversionUpload.updateMany({
      where: { id: { in: stale.map((row) => row.id) } },
      data: {
        status: 'skipped',
        lastError: `Click older than the ${CLICK_WINDOW_DAYS}-day conversion window`,
      },
    })
  }

  if (!sendable.length) {
    return { ...EMPTY, discovered, skipped: stale.length }
  }

  const conversions: ClickConversion[] = sendable.map((row) => ({
    gclid: row.gclid,
    convertedAt: row.convertedAt,
    value: row.value,
    currencyCode: row.currencyCode,
  }))

  let result: Awaited<ReturnType<typeof uploadClickConversions>>
  try {
    result = await uploadClickConversions(conversions)
  } catch (error) {
    // The whole request failed — an expired refresh token, a network fault, Ads
    // being down. Nothing was accepted, so every row stays pending with its
    // attempt counted, and the next sweep tries again.
    const message = error instanceof Error ? error.message : String(error)
    await prisma.adsConversionUpload.updateMany({
      where: { id: { in: sendable.map((row) => row.id) } },
      data: { attempts: { increment: 1 }, lastError: message.slice(0, 1000) },
    })
    logger.error('Ads conversion upload failed', { count: sendable.length, error: message })
    return { ...EMPTY, discovered, attempted: sendable.length, failed: sendable.length, skipped: stale.length }
  }

  const uploadedAt = new Date()

  if (result.uploaded.length) {
    await prisma.adsConversionUpload.updateMany({
      where: { id: { in: result.uploaded.map((index) => sendable[index].id) } },
      data: {
        status: 'uploaded',
        uploadedAt,
        attempts: { increment: 1 },
        lastError: null,
      },
    })
  }

  // Rejections are per row and are left pending so they retry, up to the cap.
  // Google's partial-failure detail does not reliably distinguish "try later"
  // from "never going to work", so the attempt cap is what stops the latter.
  for (const failure of result.failures) {
    await prisma.adsConversionUpload.update({
      where: { id: sendable[failure.index].id },
      data: { attempts: { increment: 1 }, lastError: failure.message.slice(0, 1000) },
    })
  }

  return {
    discovered,
    attempted: sendable.length,
    uploaded: result.uploaded.length,
    failed: result.failures.length,
    skipped: stale.length,
  }
}
