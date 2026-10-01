import { describe, expect, it, vi, beforeEach } from 'vitest'

const sendSms = vi.hoisted(() => vi.fn())
const sendEmail = vi.hoisted(() => vi.fn())
const smsConfigured = vi.hoisted(() => vi.fn())

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }))
vi.mock('./sms', () => ({ sendSms, isSmsConfigured: smsConfigured }))
vi.mock('./claims', () => ({ sendTransactionalEmail: sendEmail }))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { issueCaseSubmitOtp, verifyCaseSubmitOtp } from './case-submit-otp'

const prismaMock = prisma as any

function codeFromLastSend(): string {
  const body = sendSms.mock.calls.at(-1)?.[1] ?? sendEmail.mock.calls.at(-1)?.[0]?.body ?? ''
  return /(\d{6})/.exec(body)![1]
}

describe('case submit OTP', () => {
  beforeEach(() => {
    resetUniversalPrismaMock()
    sendSms.mockReset().mockResolvedValue(true)
    sendEmail.mockReset().mockResolvedValue(true)
    smsConfigured.mockReset().mockReturnValue(true)
    prismaMock.caseSubmitOtp.findMany.mockResolvedValue([])
    prismaMock.caseSubmitOtp.create.mockImplementation(async ({ data }: any) => ({ id: 'otp-1', ...data }))
  })

  it('texts the code when the claimant prefers text', async () => {
    const result = await issueCaseSubmitOtp({ assessmentId: 'a1', email: 'x@example.com', phone: '(555) 111-2222', preferredContactMethod: 'text' })
    expect(result.ok && result.channel).toBe('sms')
    expect(sendSms).toHaveBeenCalledWith('5551112222', expect.stringMatching(/\d{6}/))
    expect(sendEmail).not.toHaveBeenCalled()
    const stored = prismaMock.caseSubmitOtp.create.mock.calls[0][0].data
    expect(stored.destination).toBe('5551112222')
    expect(stored.codeHash).not.toContain(codeFromLastSend())
  })

  it('falls back to email when the text fails', async () => {
    sendSms.mockResolvedValue(false)
    const result = await issueCaseSubmitOtp({ assessmentId: 'a1', email: 'X@Example.com', phone: '5551112222', preferredContactMethod: 'phone' })
    expect(result.ok && result.channel).toBe('email')
    expect(sendEmail.mock.calls[0][0].to).toBe('x@example.com')
  })

  it('refuses a resend inside the cooldown', async () => {
    prismaMock.caseSubmitOtp.findMany.mockResolvedValue([{ createdAt: new Date() }])
    const result = await issueCaseSubmitOtp({ assessmentId: 'a1', email: 'x@example.com' })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.code).toBe('OTP_RESEND_TOO_SOON')
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('accepts the right code for the same contact and rejects a wrong one', async () => {
    await issueCaseSubmitOtp({ assessmentId: 'a1', email: 'x@example.com', preferredContactMethod: 'email' })
    const row = { ...prismaMock.caseSubmitOtp.create.mock.calls[0][0].data, id: 'otp-1', attempts: 0, verifiedAt: null }
    prismaMock.caseSubmitOtp.findFirst.mockResolvedValue(row)
    prismaMock.caseSubmitOtp.update.mockResolvedValue({ attempts: 1 })

    const wrong = await verifyCaseSubmitOtp({ assessmentId: 'a1', code: codeFromLastSend() === '000000' ? '111111' : '000000', email: 'x@example.com' })
    expect(wrong.ok).toBe(false)
    expect(!wrong.ok && wrong.code).toBe('OTP_INVALID')

    const changed = await verifyCaseSubmitOtp({ assessmentId: 'a1', code: codeFromLastSend(), email: 'other@example.com' })
    expect(!changed.ok && changed.code).toBe('OTP_CONTACT_CHANGED')

    const right = await verifyCaseSubmitOtp({ assessmentId: 'a1', code: codeFromLastSend(), email: 'X@example.com' })
    expect(right).toEqual({ ok: true, otpId: 'otp-1' })
  })

  it('requires a code before submitting', async () => {
    const result = await verifyCaseSubmitOtp({ assessmentId: 'a1', code: '', email: 'x@example.com' })
    expect(!result.ok && result.code).toBe('OTP_REQUIRED')
  })
})
