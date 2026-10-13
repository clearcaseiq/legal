/**
 * The sweep that tells Google Ads a click became a signed case.
 *
 * What these pin down is mostly about restraint: never report the same
 * retention twice, never keep retrying something Ads will always reject, and
 * never let an advertising integration throw inside the background loop that
 * also runs sweeps people depend on.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./google-ads-conversions', () => ({
  isGoogleAdsConfigured: vi.fn().mockReturnValue(true),
  isConversionActionConfigured: vi.fn((kind: string) => kind === 'retained'),
  uploadClickConversions: vi.fn(),
}))
vi.mock('./case-submit-otp', () => ({
  isCaseSubmitOtpRequired: vi.fn().mockReturnValue(true),
}))
vi.mock('./revenue-projection', () => ({
  buildRevenueProjection: vi.fn().mockResolvedValue({
    caseMedianValue: 120_000,
    projectedFeeRevenue: 3_960,
  }),
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { isConversionActionConfigured, isGoogleAdsConfigured, uploadClickConversions } from './google-ads-conversions'
import { buildRevenueProjection } from './revenue-projection'
import { isCaseSubmitOtpRequired } from './case-submit-otp'
import { runAdsConversionSweep } from './ads-conversion-sweep'

const DAY_MS = 24 * 60 * 60 * 1000

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS)
}

/** A retained case, its intake lead's click id, and what is already recorded. */
function given(options: {
  retained?: { assessmentId: string; convertedAt: Date }[]
  leads?: { assessmentId: string; gclid: string | null }[]
  existing?: { assessmentId: string }[]
  pending?: {
    id: string
    gclid: string
    convertedAt: Date
    value?: number | null
    currencyCode?: string
  }[]
}) {
  vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue((options.retained || []) as any)
  vi.mocked(prisma.intakeLead.findMany).mockResolvedValue((options.leads || []) as any)

  // Dispatched on the query rather than on call order. The dedup lookup is
  // skipped entirely when no case is retained, so an ordered queue would hand
  // the pending rows to whichever query happened to run first.
  vi.mocked(prisma.adsConversionUpload.findMany).mockImplementation((args: any) =>
    Promise.resolve(
      args?.where?.status === 'pending'
        ? ((options.pending || []).map((row) => ({ currencyCode: 'USD', value: null, ...row })) as any)
        : ((options.existing || []) as any),
    ),
  )
}

const created = () => vi.mocked(prisma.adsConversionUpload.create).mock.calls.map((call) => (call[0] as any).data)
const updatedMany = () => vi.mocked(prisma.adsConversionUpload.updateMany).mock.calls.map((call) => call[0] as any)
const pendingQuery = () =>
  vi.mocked(prisma.adsConversionUpload.findMany).mock.calls
    .map((call) => call[0] as any)
    .find((args) => args?.where?.status === 'pending')

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.mocked(isGoogleAdsConfigured).mockReturnValue(true)
  vi.mocked(isConversionActionConfigured).mockImplementation((kind) => kind === 'retained')
  vi.mocked(isCaseSubmitOtpRequired).mockReturnValue(true)
  vi.mocked(uploadClickConversions).mockReset().mockResolvedValue({ uploaded: [], failures: [] })
  vi.mocked(buildRevenueProjection)
    .mockReset()
    .mockResolvedValue({ caseMedianValue: 120_000, projectedFeeRevenue: 3_960 })
})

describe('runAdsConversionSweep', () => {
  it('does nothing at all when Ads is not configured', async () => {
    vi.mocked(isGoogleAdsConfigured).mockReturnValue(false)

    const result = await runAdsConversionSweep()

    expect(result).toEqual({ discovered: 0, attempted: 0, uploaded: 0, failed: 0, skipped: 0 })
    expect(prisma.leadSubmission.findMany).not.toHaveBeenCalled()
    expect(uploadClickConversions).not.toHaveBeenCalled()
  })

  it('records a retained case that arrived from an ad click', async () => {
    given({
      retained: [{ assessmentId: 'asm-1', convertedAt: daysAgo(2) }],
      leads: [{ assessmentId: 'asm-1', gclid: 'Cj0KCQ' }],
    })

    const result = await runAdsConversionSweep()

    expect(result.discovered).toBe(1)
    expect(created()[0]).toMatchObject({
      assessmentId: 'asm-1',
      gclid: 'Cj0KCQ',
      status: 'pending',
      // Projected fee revenue, so Ads bids on what the case is worth to us
      // rather than treating every retention as interchangeable.
      value: 3_960,
    })
  })

  /**
   * Organic and direct arrivals are most of them, and there is nothing to tell
   * Ads about a case it did not send.
   */
  it('ignores a retained case with no click id', async () => {
    given({
      retained: [{ assessmentId: 'asm-1', convertedAt: daysAgo(2) }],
      leads: [],
    })

    const result = await runAdsConversionSweep()

    expect(result.discovered).toBe(0)
    expect(prisma.adsConversionUpload.create).not.toHaveBeenCalled()
  })

  /**
   * Re-reporting a retention would double-count it in Ads and inflate whatever
   * the bidding strategy is optimising against.
   */
  it('does not record a case that has already been recorded', async () => {
    given({
      retained: [{ assessmentId: 'asm-1', convertedAt: daysAgo(2) }],
      leads: [{ assessmentId: 'asm-1', gclid: 'Cj0KCQ' }],
      existing: [{ assessmentId: 'asm-1' }],
    })

    const result = await runAdsConversionSweep()

    expect(result.discovered).toBe(0)
    expect(prisma.adsConversionUpload.create).not.toHaveBeenCalled()
  })

  /** A case we could not price is still a conversion, just an unvalued one. */
  it('records a conversion with no value when the case has no prediction', async () => {
    vi.mocked(buildRevenueProjection).mockResolvedValue(null)
    given({
      retained: [{ assessmentId: 'asm-1', convertedAt: daysAgo(2) }],
      leads: [{ assessmentId: 'asm-1', gclid: 'Cj0KCQ' }],
    })

    await runAdsConversionSweep()

    expect(created()[0]).toMatchObject({ value: null })
  })

  it('uploads pending conversions and marks them uploaded', async () => {
    const convertedAt = daysAgo(3)
    given({ pending: [{ id: 'up-1', gclid: 'Cj0KCQ', convertedAt, value: 3_960 }] })
    vi.mocked(uploadClickConversions).mockResolvedValue({ uploaded: [0], failures: [] })

    const result = await runAdsConversionSweep()

    expect(uploadClickConversions).toHaveBeenCalledWith([
      { gclid: 'Cj0KCQ', convertedAt, value: 3_960, currencyCode: 'USD' },
    ])
    expect(result).toMatchObject({ attempted: 1, uploaded: 1, failed: 0 })
    expect(updatedMany()[0].data).toMatchObject({ status: 'uploaded' })
  })

  /**
   * Past the conversion window Ads rejects the click no matter how often it is
   * sent, so this is terminal and deliberately not counted as a failure.
   */
  it('skips a click older than the 90-day window instead of retrying forever', async () => {
    given({ pending: [{ id: 'up-old', gclid: 'stale', convertedAt: daysAgo(120) }] })

    const result = await runAdsConversionSweep()

    expect(uploadClickConversions).not.toHaveBeenCalled()
    expect(result).toMatchObject({ skipped: 1, attempted: 0, failed: 0 })
    expect(updatedMany()[0].data).toMatchObject({ status: 'skipped' })
  })

  it('still sends the fresh conversions when a stale one is in the same batch', async () => {
    given({
      pending: [
        { id: 'up-old', gclid: 'stale', convertedAt: daysAgo(120) },
        { id: 'up-new', gclid: 'fresh', convertedAt: daysAgo(1) },
      ],
    })
    vi.mocked(uploadClickConversions).mockResolvedValue({ uploaded: [0], failures: [] })

    const result = await runAdsConversionSweep()

    expect(vi.mocked(uploadClickConversions).mock.calls[0][0]).toHaveLength(1)
    expect(result).toMatchObject({ skipped: 1, uploaded: 1 })
  })

  /**
   * A rejected row is left pending so it retries; the attempt cap is what stops
   * one that will never succeed.
   */
  it('counts an attempt against a row Ads rejected without marking it uploaded', async () => {
    given({
      pending: [
        { id: 'up-1', gclid: 'a', convertedAt: daysAgo(1) },
        { id: 'up-2', gclid: 'b', convertedAt: daysAgo(1) },
      ],
    })
    vi.mocked(uploadClickConversions).mockResolvedValue({
      uploaded: [0],
      failures: [{ index: 1, message: 'INVALID_GCLID' }],
    })

    const result = await runAdsConversionSweep()

    expect(result).toMatchObject({ uploaded: 1, failed: 1 })
    const update = vi.mocked(prisma.adsConversionUpload.update).mock.calls[0][0] as any
    expect(update.where.id).toBe('up-2')
    expect(update.data).toMatchObject({ attempts: { increment: 1 }, lastError: 'INVALID_GCLID' })
  })

  /**
   * An expired refresh token or an Ads outage fails the whole request. Nothing
   * was accepted, so every row must stay pending rather than being lost.
   */
  it('leaves the whole batch pending when the request itself fails', async () => {
    given({ pending: [{ id: 'up-1', gclid: 'a', convertedAt: daysAgo(1) }] })
    vi.mocked(uploadClickConversions).mockRejectedValue(new Error('Token has been expired or revoked.'))

    const result = await runAdsConversionSweep()

    expect(result).toMatchObject({ attempted: 1, uploaded: 0, failed: 1 })
    const update = updatedMany()[0]
    expect(update.data).toMatchObject({ attempts: { increment: 1 } })
    expect(update.data.status).toBeUndefined()
    expect(update.data.lastError).toContain('expired or revoked')
  })

  it('only asks for rows still under the attempt cap', async () => {
    given({ pending: [] })

    await runAdsConversionSweep()

    expect(pendingQuery().where).toMatchObject({ status: 'pending', attempts: { lt: 5 } })
  })

  it('reports nothing to upload without calling out to Ads', async () => {
    given({ pending: [] })

    const result = await runAdsConversionSweep()

    expect(result).toMatchObject({ attempted: 0, uploaded: 0 })
    expect(uploadClickConversions).not.toHaveBeenCalled()
  })
})

/**
 * "Qualified lead": a case from an ad click that passed the one-time code and
 * was sent to attorneys. Earlier and more numerous than a retention, so bidding
 * has something real to learn from instead of raw form submits.
 */
describe('qualified lead conversions', () => {
  const qualified = () => (prisma as any).adsQualifiedConversionUpload

  function givenQualified(options: {
    submitted?: { assessmentId: string; submittedAt: Date }[]
    leads?: { assessmentId: string; gclid: string | null }[]
    existing?: { assessmentId: string }[]
    otpConsumed?: { assessmentId: string }[]
    pending?: { id: string; gclid: string; convertedAt: Date }[]
  }) {
    vi.mocked(isConversionActionConfigured).mockImplementation((kind) => kind === 'qualified')
    vi.mocked(prisma.leadSubmission.findMany).mockResolvedValue((options.submitted || []) as any)
    vi.mocked(prisma.intakeLead.findMany).mockResolvedValue((options.leads || []) as any)
    vi.mocked(prisma.caseSubmitOtp.findMany).mockResolvedValue((options.otpConsumed || []) as any)
    vi.mocked(qualified().findMany).mockImplementation((args: any) =>
      Promise.resolve(
        args?.where?.status === 'pending'
          ? (options.pending || []).map((row) => ({ currencyCode: 'USD', value: null, ...row }))
          : options.existing || [],
      ),
    )
  }

  const qualifiedCreated = () => vi.mocked(qualified().create).mock.calls.map((call: any) => call[0].data)

  it('selects claimant submissions from the last 90 days', async () => {
    givenQualified({})

    await runAdsConversionSweep()

    const where = (vi.mocked(prisma.leadSubmission.findMany).mock.calls[0][0] as any).where
    expect(where.sourceType).toBe('plaintiff')
    const ageDays = (Date.now() - where.submittedAt.gte.getTime()) / DAY_MS
    expect(Math.round(ageDays)).toBe(90)
  })

  it('records a submitted case from an ad click whose code was used', async () => {
    const submittedAt = daysAgo(1)
    givenQualified({
      submitted: [{ assessmentId: 'asm-1', submittedAt }],
      leads: [{ assessmentId: 'asm-1', gclid: 'Cj0KCQ' }],
      otpConsumed: [{ assessmentId: 'asm-1' }],
    })

    const result = await runAdsConversionSweep()

    expect(result.discovered).toBe(1)
    // Click id, timestamp and no value: nothing about the case leaves.
    expect(qualifiedCreated()[0]).toEqual({
      assessmentId: 'asm-1',
      gclid: 'Cj0KCQ',
      value: null,
      convertedAt: submittedAt,
      status: 'pending',
    })
    // Never priced, and never written to the retained-case table.
    expect(buildRevenueProjection).not.toHaveBeenCalled()
    expect(prisma.adsConversionUpload.create).not.toHaveBeenCalled()
  })

  it('skips a submission whose code was never used', async () => {
    givenQualified({
      submitted: [{ assessmentId: 'asm-1', submittedAt: daysAgo(1) }],
      leads: [{ assessmentId: 'asm-1', gclid: 'Cj0KCQ' }],
      otpConsumed: [],
    })

    const result = await runAdsConversionSweep()

    expect(result.discovered).toBe(0)
    expect(qualified().create).not.toHaveBeenCalled()
  })

  it('does not require a code when the code check is switched off', async () => {
    vi.mocked(isCaseSubmitOtpRequired).mockReturnValue(false)
    givenQualified({
      submitted: [{ assessmentId: 'asm-1', submittedAt: daysAgo(1) }],
      leads: [{ assessmentId: 'asm-1', gclid: 'Cj0KCQ' }],
    })

    const result = await runAdsConversionSweep()

    expect(result.discovered).toBe(1)
    expect(prisma.caseSubmitOtp.findMany).not.toHaveBeenCalled()
  })

  it('records each case once, however often it is resubmitted', async () => {
    givenQualified({
      submitted: [{ assessmentId: 'asm-1', submittedAt: daysAgo(1) }],
      leads: [{ assessmentId: 'asm-1', gclid: 'Cj0KCQ' }],
      otpConsumed: [{ assessmentId: 'asm-1' }],
      existing: [{ assessmentId: 'asm-1' }],
    })

    const result = await runAdsConversionSweep()

    expect(result.discovered).toBe(0)
    expect(qualified().create).not.toHaveBeenCalled()
  })

  it('ignores a submission with no click id', async () => {
    givenQualified({
      submitted: [{ assessmentId: 'asm-1', submittedAt: daysAgo(1) }],
      leads: [],
      otpConsumed: [{ assessmentId: 'asm-1' }],
    })

    const result = await runAdsConversionSweep()

    expect(result.discovered).toBe(0)
  })

  it('uploads pending qualified rows against the qualified conversion action', async () => {
    const convertedAt = daysAgo(1)
    givenQualified({ pending: [{ id: 'q-1', gclid: 'Cj0KCQ', convertedAt }] })
    vi.mocked(uploadClickConversions).mockResolvedValue({ uploaded: [0], failures: [] })

    const result = await runAdsConversionSweep()

    expect(uploadClickConversions).toHaveBeenCalledWith(
      [{ gclid: 'Cj0KCQ', convertedAt, value: null, currencyCode: 'USD' }],
      'qualified',
    )
    expect(result).toMatchObject({ uploaded: 1 })
    const update = vi.mocked(qualified().updateMany).mock.calls[0][0] as any
    expect(update.data).toMatchObject({ status: 'uploaded' })
    expect(prisma.adsConversionUpload.updateMany).not.toHaveBeenCalled()
  })

  it('leaves the retained-case pipeline alone when only the qualified action is set', async () => {
    givenQualified({})

    await runAdsConversionSweep()

    expect(prisma.adsConversionUpload.findMany).not.toHaveBeenCalled()
  })
})
