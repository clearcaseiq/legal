import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * The manual-review email used to interpolate the routing engine's `reason` and
 * `note` straight into the body. The note is a candidate funnel built for the
 * admin queue, so a claimant on an empty marketplace was emailed
 * "No eligible attorneys (0 considered, 0 eligible)", and one on a stocked
 * marketplace "No attorneys passed quality gate (14 considered, 3 eligible,
 * 0 qualified)".
 *
 * The diagnostics still have to reach operators, so they stay on the payload.
 */

vi.mock('./prisma', () => ({
  prisma: {
    assessment: {
      findUnique: vi.fn(async () => ({
        id: 'asm-1',
        userId: 'user-1',
        claimType: 'auto',
        user: { email: 'claimant@example.com', firstName: 'Dana' },
      })),
    },
  },
}))

vi.mock('./logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

const createNotificationEvent = vi.fn(async () => ({ id: 'evt-1' }))
vi.mock('./platform-notifications', () => ({
  createNotificationEvent: (...args: unknown[]) => createNotificationEvent(...(args as [])),
  deliverDirectNotification: vi.fn(async () => ({ delivered: true })),
}))

vi.mock('./app-url', () => ({ webUrl: (p: string) => `https://app.clearcaseiq.test${p}` }))
vi.mock('./attorney-push', () => ({ notifyAttorneyByUserEmail: vi.fn() }))
vi.mock('./offer-reference', () => ({ offerReplyInstruction: () => '' }))
vi.mock('./matching-rules-config', () => ({
  getCurrentAttorneyResponseDeadlineMinutes: async () => 15,
}))

describe('sendPlaintiffManualReviewNeeded', () => {
  beforeEach(() => {
    createNotificationEvent.mockClear()
  })

  it('keeps routing diagnostics out of the body a claimant reads', async () => {
    const { sendPlaintiffManualReviewNeeded } = await import('./case-notifications')

    await sendPlaintiffManualReviewNeeded(
      'asm-1',
      'no_attorney_match',
      'No eligible attorneys (0 considered, 0 eligible)',
    )

    expect(createNotificationEvent).toHaveBeenCalled()
    for (const [event] of createNotificationEvent.mock.calls as unknown as Array<[
      { body: string; payload?: Record<string, unknown> },
    ]>) {
      expect(event.body).not.toContain('0 considered')
      expect(event.body).not.toContain('No eligible attorneys')
      expect(event.body).not.toContain('no attorney match')
      // No timeframe either: every reason landing here means routing found no
      // home for the case, so any estimate would be invented.
      expect(event.body).not.toMatch(/\d+\s*hours?/i)
      expect(event.body).toContain('Your case is being reviewed by our team.')
    }
  })

  it('still records the reason and note for operators', async () => {
    const { sendPlaintiffManualReviewNeeded } = await import('./case-notifications')

    await sendPlaintiffManualReviewNeeded('asm-1', 'no_attorney_match', 'No eligible attorneys')

    const [event] = createNotificationEvent.mock.calls[0] as unknown as [
      { payload?: Record<string, unknown> },
    ]
    expect(event.payload).toMatchObject({
      reason: 'no_attorney_match',
      note: 'No eligible attorneys',
    })
  })
})
