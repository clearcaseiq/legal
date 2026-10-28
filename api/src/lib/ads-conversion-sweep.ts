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
 *
 * The same sweep also reports "qualified lead" conversions — a case from an ad
 * click that passed the one-time code and was sent to attorneys — against a
 * separate conversion action, under the same rule: click id and timestamp only.
 * And "assessment submitted" — the Primary conversion — once a case from an ad
 * click has had its assessment created.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import {
  CONVERSION_KINDS,
  isConversionActionConfigured,
  isGoogleAdsConfigured,
  uploadClickConversions,
  type ClickConversion,
  type ConversionKind,
} from './google-ads-conversions'
import { buildRevenueProjection } from './revenue-projection'
import { isCaseSubmitOtpRequired } from './case-submit-otp'

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
  /** Retained cases and qualified leads newly found to have a click id worth reporting. */
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

/**
 * Find cases from an ad click that were sent to attorneys after passing the
 * one-time code, and that have no qualified conversion recorded yet.
 *
 * `sourceType: 'plaintiff'` is the claimant's own submission; the submit route
 * writes it on every successful send, including a resend of a held case. The
 * code is consumed only once that submission lands, so a consumed code is the
 * proof it was a person holding the contact details. With the code switched
 * off there is no such proof to require, and the submission alone counts.
 */
async function discoverQualified(): Promise<number> {
  const since = new Date(Date.now() - CLICK_WINDOW_DAYS * 24 * 60 * 60_000)
  const submitted = await prisma.leadSubmission.findMany({
    where: { sourceType: 'plaintiff', submittedAt: { gte: since } },
    select: { assessmentId: true, submittedAt: true },
    orderBy: { submittedAt: 'desc' },
    take: BATCH_SIZE * 4,
  })
  if (!submitted.length) return 0

  const assessmentIds = submitted.map((lead) => lead.assessmentId)
  const otpRequired = isCaseSubmitOtpRequired()

  const [leads, existing, verified] = await Promise.all([
    prisma.intakeLead.findMany({
      where: { assessmentId: { in: assessmentIds }, gclid: { not: null } },
      select: { assessmentId: true, gclid: true },
    }),
    prisma.adsQualifiedConversionUpload.findMany({
      where: { assessmentId: { in: assessmentIds } },
      select: { assessmentId: true },
    }),
    otpRequired
      ? prisma.caseSubmitOtp.findMany({
          where: { assessmentId: { in: assessmentIds }, consumedAt: { not: null } },
          select: { assessmentId: true },
        })
      : Promise.resolve(null),
  ])

  const alreadyRecorded = new Set(existing.map((row) => row.assessmentId))
  const passedOtp = verified ? new Set(verified.map((row) => row.assessmentId)) : null
  const submittedAt = new Map(submitted.map((lead) => [lead.assessmentId, lead.submittedAt]))

  let discovered = 0
  for (const lead of leads) {
    if (!lead.assessmentId || !lead.gclid) continue
    if (alreadyRecorded.has(lead.assessmentId)) continue
    if (passedOtp && !passedOtp.has(lead.assessmentId)) continue
    const converted = submittedAt.get(lead.assessmentId)
    if (!converted) continue

    try {
      await prisma.adsQualifiedConversionUpload.create({
        data: {
          assessmentId: lead.assessmentId,
          gclid: lead.gclid,
          // No value: nothing is known about what a submitted case is worth
          // until an attorney takes it, and the retained conversion carries that.
          value: null,
          convertedAt: converted,
          status: 'pending',
        },
      })
      discovered += 1
    } catch (error) {
      logger.debug('Qualified ads conversion already recorded for assessment', {
        assessmentId: lead.assessmentId,
        error,
      })
    }
  }

  return discovered
}

/**
 * Find cases from an ad click whose assessment was created, with no submitted
 * conversion recorded yet: the Primary "Assessment submitted" conversion.
 *
 * An intake lead gains its `assessmentId` only when the server creates the
 * assessment, which is what "Generate My Free Report" succeeding means. That is
 * the whole condition. Opening, refreshing or sharing `/results/<id>` changes
 * nothing here, and the unique `assessmentId` keeps it to one row per case.
 */
async function discoverSubmitted(): Promise<number> {
  const since = new Date(Date.now() - CLICK_WINDOW_DAYS * 24 * 60 * 60_000)
  const leads = await prisma.intakeLead.findMany({
    where: { assessmentId: { not: null }, gclid: { not: null }, createdAt: { gte: since } },
    select: { assessmentId: true, gclid: true },
    orderBy: { createdAt: 'desc' },
    take: BATCH_SIZE * 4,
  })
  const withIds = leads.filter((lead): lead is { assessmentId: string; gclid: string } =>
    Boolean(lead.assessmentId && lead.gclid),
  )
  if (!withIds.length) return 0

  const assessmentIds = withIds.map((lead) => lead.assessmentId)
  const [existing, assessments] = await Promise.all([
    prisma.adsSubmittedConversionUpload.findMany({
      where: { assessmentId: { in: assessmentIds } },
      select: { assessmentId: true },
    }),
    prisma.assessment.findMany({
      where: { id: { in: assessmentIds } },
      select: { id: true, createdAt: true },
    }),
  ])

  const alreadyRecorded = new Set(existing.map((row) => row.assessmentId))
  const createdAt = new Map(assessments.map((assessment) => [assessment.id, assessment.createdAt]))

  let discovered = 0
  for (const lead of withIds) {
    if (alreadyRecorded.has(lead.assessmentId)) continue
    // A lead pointing at an assessment that no longer exists was deleted, not submitted.
    const converted = createdAt.get(lead.assessmentId)
    if (!converted) continue

    try {
      await prisma.adsSubmittedConversionUpload.create({
        data: {
          assessmentId: lead.assessmentId,
          gclid: lead.gclid,
          value: null,
          convertedAt: converted,
          status: 'pending',
        },
      })
      discovered += 1
    } catch (error) {
      logger.debug('Submitted ads conversion already recorded for assessment', {
        assessmentId: lead.assessmentId,
        error,
      })
    }
  }

  return discovered
}

/** Whether the click is still inside the window Ads will accept. */
function withinClickWindow(convertedAt: Date, now: number): boolean {
  return now - convertedAt.getTime() <= CLICK_WINDOW_DAYS * 24 * 60 * 60_000
}

type UploadRow = { id: string; gclid: string; convertedAt: Date; value: number | null; currencyCode: string }

/**
 * The upload tables share their columns and lifecycle, so the upload stage is
 * written once against the handful of calls it makes.
 */
type UploadTable = {
  findMany(args: { where: object; orderBy: object; take: number }): Promise<UploadRow[]>
  updateMany(args: { where: object; data: object }): Promise<unknown>
  update(args: { where: { id: string }; data: object }): Promise<unknown>
}

function uploadTable(kind: ConversionKind): UploadTable {
  const tables = {
    retained: prisma.adsConversionUpload,
    qualified: prisma.adsQualifiedConversionUpload,
    submitted: prisma.adsSubmittedConversionUpload,
  }
  return tables[kind] as unknown as UploadTable
}

const DISCOVER: Record<ConversionKind, () => Promise<number>> = {
  retained: discover,
  qualified: discoverQualified,
  submitted: discoverSubmitted,
}

/** Send what is pending for one conversion action and record the outcome of each row. */
async function uploadPending(kind: ConversionKind): Promise<Omit<AdsConversionSweepResult, 'discovered'>> {
  const table = uploadTable(kind)
  const none = { attempted: 0, uploaded: 0, failed: 0, skipped: 0 }

  const pending = await table.findMany({
    where: { status: 'pending', attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { convertedAt: 'asc' },
    take: BATCH_SIZE,
  })
  if (!pending.length) return none

  const now = Date.now()
  const stale = pending.filter((row) => !withinClickWindow(row.convertedAt, now))
  const sendable = pending.filter((row) => withinClickWindow(row.convertedAt, now))

  if (stale.length) {
    await table.updateMany({
      where: { id: { in: stale.map((row) => row.id) } },
      data: {
        status: 'skipped',
        lastError: `Click older than the ${CLICK_WINDOW_DAYS}-day conversion window`,
      },
    })
  }

  if (!sendable.length) {
    return { ...none, skipped: stale.length }
  }

  const conversions: ClickConversion[] = sendable.map((row) => ({
    gclid: row.gclid,
    convertedAt: row.convertedAt,
    value: row.value,
    currencyCode: row.currencyCode,
  }))

  let result: Awaited<ReturnType<typeof uploadClickConversions>>
  try {
    result = kind === 'retained'
      ? await uploadClickConversions(conversions)
      : await uploadClickConversions(conversions, kind)
  } catch (error) {
    // The whole request failed — an expired refresh token, a network fault, Ads
    // being down. Nothing was accepted, so every row stays pending with its
    // attempt counted, and the next sweep tries again.
    const message = error instanceof Error ? error.message : String(error)
    await table.updateMany({
      where: { id: { in: sendable.map((row) => row.id) } },
      data: { attempts: { increment: 1 }, lastError: message.slice(0, 1000) },
    })
    logger.error('Ads conversion upload failed', { kind, count: sendable.length, error: message })
    return { attempted: sendable.length, uploaded: 0, failed: sendable.length, skipped: stale.length }
  }

  const uploadedAt = new Date()

  if (result.uploaded.length) {
    await table.updateMany({
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
    await table.update({
      where: { id: sendable[failure.index].id },
      data: { attempts: { increment: 1 }, lastError: failure.message.slice(0, 1000) },
    })
  }

  return {
    attempted: sendable.length,
    uploaded: result.uploaded.length,
    failed: result.failures.length,
    skipped: stale.length,
  }
}

/**
 * Record retained cases, and qualified leads, with Google Ads. Never throws.
 *
 * A failure here must not take the background loop down with it: the loop also
 * runs sweeps that people depend on, and an advertising integration is the
 * least important thing in it.
 *
 * Each kind runs only when its own conversion action is configured, so the
 * qualified conversion can be switched on before or after the retained one.
 */
export async function runAdsConversionSweep(): Promise<AdsConversionSweepResult> {
  if (!isGoogleAdsConfigured()) return EMPTY

  const total: AdsConversionSweepResult = { ...EMPTY }
  for (const kind of CONVERSION_KINDS) {
    if (!isConversionActionConfigured(kind)) continue
    total.discovered += await DISCOVER[kind]()
    const result = await uploadPending(kind)
    total.attempted += result.attempted
    total.uploaded += result.uploaded
    total.failed += result.failed
    total.skipped += result.skipped
  }
  return total
}

