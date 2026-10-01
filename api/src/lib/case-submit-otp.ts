/**
 * One-time code a claimant enters before their case goes to attorneys.
 *
 * Submitting puts real people on the phone to whoever is named on the case, so
 * the person pressing "Send My Case" has to show they hold the contact details
 * the case is about to be sent under. The code goes to the claimant's preferred
 * channel (text for `text`/`phone`, otherwise email) and falls back to email
 * when SMS is unavailable or fails.
 */
import crypto from 'crypto'
import { prisma } from './prisma'
import { logger } from './logger'
import { sendSms, isSmsConfigured } from './sms'
import { sendTransactionalEmail } from './claims'

export const CASE_SUBMIT_OTP_TTL_MINUTES = 10
export const CASE_SUBMIT_OTP_MAX_ATTEMPTS = 5
export const CASE_SUBMIT_OTP_RESEND_SECONDS = 30
export const CASE_SUBMIT_OTP_MAX_PER_HOUR = 5

export type CaseSubmitOtpChannel = 'sms' | 'email'

export function isCaseSubmitOtpRequired(): boolean {
  return (process.env.CASE_SUBMIT_OTP_REQUIRED || '').trim().toLowerCase() !== 'false'
}

function normalizeEmail(email: string | null | undefined): string {
  return (email || '').trim().toLowerCase()
}

function phoneDigits(phone: string | null | undefined): string {
  const digits = (phone || '').replace(/\D/g, '')
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
}

function hashCode(assessmentId: string, code: string): string {
  return crypto.createHash('sha256').update(`${assessmentId}:${code}`).digest('hex')
}

function maskDestination(channel: CaseSubmitOtpChannel, destination: string): string {
  if (channel === 'sms') return `(***) ***-${destination.slice(-4)}`
  const [local, domain] = destination.split('@')
  if (!domain) return destination
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(local.length - 1, 2))}@${domain}`
}

export type IssueCaseSubmitOtpResult =
  | {
      ok: true
      channel: CaseSubmitOtpChannel
      maskedDestination: string
      expiresAt: Date
      resendAfterSeconds: number
      /** Only outside production, and only when delivery failed, so local runs without a provider can finish. */
      devCode?: string
    }
  | { ok: false; status: number; error: string; code: string; retryAfterSeconds?: number }

export async function issueCaseSubmitOtp(params: {
  assessmentId: string
  email?: string | null
  phone?: string | null
  preferredContactMethod?: 'phone' | 'text' | 'email' | null
}): Promise<IssueCaseSubmitOtpResult> {
  const email = normalizeEmail(params.email)
  const phone = phoneDigits(params.phone)
  if (!email && phone.length < 10) {
    return { ok: false, status: 400, error: 'An email or phone number is required to send a verification code.', code: 'OTP_NO_CONTACT' }
  }

  const now = Date.now()
  const recent = await prisma.caseSubmitOtp.findMany({
    where: { assessmentId: params.assessmentId, createdAt: { gte: new Date(now - 60 * 60_000) } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })
  if (recent.length >= CASE_SUBMIT_OTP_MAX_PER_HOUR) {
    return { ok: false, status: 429, error: 'Too many codes requested. Please wait a while and try again.', code: 'OTP_RATE_LIMITED', retryAfterSeconds: 15 * 60 }
  }
  const sinceLast = recent[0] ? (now - recent[0].createdAt.getTime()) / 1000 : Infinity
  if (sinceLast < CASE_SUBMIT_OTP_RESEND_SECONDS) {
    const retryAfterSeconds = Math.ceil(CASE_SUBMIT_OTP_RESEND_SECONDS - sinceLast)
    return { ok: false, status: 429, error: `Please wait ${retryAfterSeconds} seconds before requesting another code.`, code: 'OTP_RESEND_TOO_SOON', retryAfterSeconds }
  }

  const wantsSms = params.preferredContactMethod === 'text' || params.preferredContactMethod === 'phone' || !email
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
  const expiresAt = new Date(now + CASE_SUBMIT_OTP_TTL_MINUTES * 60_000)
  const message = `Your ClearCaseIQ verification code is ${code}. It expires in ${CASE_SUBMIT_OTP_TTL_MINUTES} minutes. Never share this code.`

  let channel: CaseSubmitOtpChannel | null = null
  if (wantsSms && phone.length >= 10 && isSmsConfigured()) {
    if (await sendSms(phone, message)) channel = 'sms'
  }
  if (!channel && email) {
    const sent = await sendTransactionalEmail({
      to: email,
      subject: `Your ClearCaseIQ verification code: ${code}`,
      body: `Hi,\n\nUse this code to confirm it's you and send your case to the attorneys you selected:\n\n${code}\n\nThe code expires in ${CASE_SUBMIT_OTP_TTL_MINUTES} minutes. If you didn't request it, you can ignore this email; nothing will be sent.`,
    })
    if (sent) channel = 'email'
  }

  let devCode: string | undefined
  if (!channel) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('Case submit OTP could not be delivered', { assessmentId: params.assessmentId })
      return { ok: false, status: 502, error: 'We could not send your verification code. Please check your contact details and try again.', code: 'OTP_DELIVERY_FAILED' }
    }
    channel = email ? 'email' : 'sms'
    devCode = code
    logger.warn('Case submit OTP not delivered (no provider); returning code for local use', { assessmentId: params.assessmentId })
  }

  const destination = channel === 'sms' ? phone : email
  await prisma.caseSubmitOtp.create({
    data: {
      assessmentId: params.assessmentId,
      channel,
      destination,
      codeHash: hashCode(params.assessmentId, code),
      expiresAt,
    },
  })
  logger.info('Case submit OTP issued', { assessmentId: params.assessmentId, channel })

  return {
    ok: true,
    channel,
    maskedDestination: maskDestination(channel, destination),
    expiresAt,
    resendAfterSeconds: CASE_SUBMIT_OTP_RESEND_SECONDS,
    ...(devCode ? { devCode } : {}),
  }
}

export type VerifyCaseSubmitOtpResult =
  | { ok: true; otpId: string }
  | { ok: false; status: number; error: string; code: string; attemptsRemaining?: number }

/**
 * Check the code the claimant typed against the latest one issued for the case.
 *
 * Verification does not consume the code: a submit can still fail afterwards
 * (an attorney became unavailable, say), and making the claimant fetch a new
 * code for that would be pointless. Call `consumeCaseSubmitOtp` once the
 * submission has actually landed.
 */
export async function verifyCaseSubmitOtp(params: {
  assessmentId: string
  code: string | null | undefined
  email?: string | null
  phone?: string | null
}): Promise<VerifyCaseSubmitOtpResult> {
  const code = (params.code || '').replace(/\D/g, '')
  if (!code) {
    return { ok: false, status: 428, error: 'Enter the verification code we sent you.', code: 'OTP_REQUIRED' }
  }

  const otp = await prisma.caseSubmitOtp.findFirst({
    where: { assessmentId: params.assessmentId, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  })
  if (!otp) {
    return { ok: false, status: 428, error: 'Please request a verification code first.', code: 'OTP_REQUIRED' }
  }
  if (otp.expiresAt.getTime() < Date.now()) {
    return { ok: false, status: 400, error: 'This code has expired. Please request a new one.', code: 'OTP_EXPIRED' }
  }
  if (otp.attempts >= CASE_SUBMIT_OTP_MAX_ATTEMPTS) {
    return { ok: false, status: 400, error: 'Too many incorrect attempts. Please request a new code.', code: 'OTP_LOCKED' }
  }

  // The code proves control of one contact; the case must be sent under that same one.
  const submittedDestination = otp.channel === 'sms' ? phoneDigits(params.phone) : normalizeEmail(params.email)
  if (submittedDestination !== otp.destination) {
    return { ok: false, status: 400, error: 'Your contact details changed after the code was sent. Please request a new code.', code: 'OTP_CONTACT_CHANGED' }
  }

  const expected = Buffer.from(otp.codeHash, 'hex')
  const actual = Buffer.from(hashCode(params.assessmentId, code), 'hex')
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    const updated = await prisma.caseSubmitOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    })
    const attemptsRemaining = Math.max(CASE_SUBMIT_OTP_MAX_ATTEMPTS - updated.attempts, 0)
    return {
      ok: false,
      status: 400,
      error: attemptsRemaining > 0 ? `That code is incorrect. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} left.` : 'Too many incorrect attempts. Please request a new code.',
      code: attemptsRemaining > 0 ? 'OTP_INVALID' : 'OTP_LOCKED',
      attemptsRemaining,
    }
  }

  if (!otp.verifiedAt) {
    await prisma.caseSubmitOtp.update({ where: { id: otp.id }, data: { verifiedAt: new Date() } })
  }
  return { ok: true, otpId: otp.id }
}

export async function consumeCaseSubmitOtp(otpId: string): Promise<void> {
  await prisma.caseSubmitOtp.updateMany({ where: { id: otpId, consumedAt: null }, data: { consumedAt: new Date() } })
}
