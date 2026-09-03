/**
 * SMS service for case routing and intake notifications.
 *
 * Supports two providers, selected via `SMS_PROVIDER`:
 *   - `sns`    → Amazon SNS (uses the default AWS credential chain / instance role)
 *   - `twilio` → Twilio (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER)
 *
 * When `SMS_PROVIDER` is unset we auto-detect Twilio (its config is explicit),
 * otherwise SMS is skipped. SNS must be selected explicitly because AWS
 * credentials are ambient (instance role) and can't be reliably auto-detected.
 * All sends are best-effort and never throw.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { offerReplyInstruction } from './offer-reference'
import { getCurrentAttorneyResponseDeadlineMinutes } from './matching-rules-config'
import { isSmsSuppressed } from './sms-opt-out'

/** Resolve which SMS provider to use. */
function resolveSmsProvider(): 'sns' | 'twilio' | 'none' {
  const explicit = (process.env.SMS_PROVIDER || '').trim().toLowerCase()
  if (explicit === 'sns') return 'sns'
  if (explicit === 'twilio') return 'twilio'
  // Auto-detect: Twilio when fully configured (SNS needs an explicit opt-in).
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    return 'twilio'
  }
  return 'none'
}

let twilioClient: any = null

function getTwilioClient() {
  if (twilioClient) return twilioClient
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!accountSid || !authToken) return null
  try {
    // Dynamic import to avoid requiring Twilio when not configured
    const twilio = require('twilio')
    twilioClient = twilio(accountSid, authToken)
    return twilioClient
  } catch {
    return null
  }
}

let snsClient: any = null

function getSnsClient(): any {
  if (snsClient) return snsClient
  try {
    // Lazy require so the SDK is only loaded when SNS is actually used.
    const { SNSClient } = require('@aws-sdk/client-sns')
    // No explicit credentials: the SDK's default chain picks up the EC2
    // instance role (or AWS_* env vars in other environments).
    snsClient = new SNSClient({ region: process.env.SNS_REGION || process.env.AWS_REGION || 'us-east-1' })
    return snsClient
  } catch {
    return null
  }
}

export function isSmsConfigured(): boolean {
  const provider = resolveSmsProvider()
  if (provider === 'twilio') {
    return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER)
  }
  return provider === 'sns'
}

/** Send a single SMS through Twilio. */
async function sendViaTwilio(to: string, body: string): Promise<boolean> {
  const client = getTwilioClient()
  const from = process.env.TWILIO_PHONE_NUMBER
  if (!client || !from) {
    logger.info('SMS not configured (Twilio). Skipping send.', { to: to.slice(-4), bodyLength: body.length })
    return false
  }
  try {
    await client.messages.create({ body, from, to: normalizePhone(to) })
    logger.info('SMS sent (Twilio)', { to: to.slice(-4) })
    return true
  } catch (err: any) {
    logger.error('SMS send failed (Twilio)', { error: err.message, to: to.slice(-4) })
    return false
  }
}

/**
 * Send a single SMS through Amazon SNS.
 *
 * Set `SNS_SMS_TYPE` (defaults to Transactional), and optionally
 * `SNS_SENDER_ID` or `SNS_ORIGINATION_NUMBER` (US A2P 10DLC / toll-free numbers
 * use the origination number) to control how the message is sent.
 */
async function sendViaSns(to: string, body: string): Promise<boolean> {
  const client = getSnsClient()
  if (!client) {
    logger.warn('SMS not sent (SNS SDK unavailable)')
    return false
  }
  try {
    const { PublishCommand } = require('@aws-sdk/client-sns')
    const attributes: Record<string, any> = {
      'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: process.env.SNS_SMS_TYPE || 'Transactional' },
    }
    if (process.env.SNS_SENDER_ID) {
      attributes['AWS.SNS.SMS.SenderID'] = { DataType: 'String', StringValue: process.env.SNS_SENDER_ID }
    }
    if (process.env.SNS_ORIGINATION_NUMBER) {
      attributes['AWS.MM.SMS.OriginationNumber'] = { DataType: 'String', StringValue: process.env.SNS_ORIGINATION_NUMBER }
    }
    await client.send(
      new PublishCommand({
        PhoneNumber: normalizePhone(to),
        Message: body,
        MessageAttributes: attributes,
      })
    )
    logger.info('SMS sent (SNS)', { to: to.slice(-4) })
    return true
  } catch (err: any) {
    logger.error('SMS send failed (SNS)', { error: err?.message, to: to.slice(-4) })
    return false
  }
}

export type SendSmsOptions = {
  /**
   * Send even if the number has opted out.
   *
   * Only for the confirmation that acknowledges the opt-out itself, which
   * carriers expect and which is part of honouring the request rather than a
   * further message. Nothing else should set this.
   */
  ignoreOptOut?: boolean
}

/**
 * Send SMS to a phone number through the configured provider (SNS or Twilio).
 *
 * Checked for opt-out here rather than in the notification layer because this is
 * the only place every outbound message passes through: of the eight call sites,
 * six reach this function directly and never touch `platform-notifications`. A
 * suppression check anywhere else would leave the claimant-facing texts — the
 * ones a STOP is actually about — uncovered.
 */
export async function sendSms(to: string, body: string, options: SendSmsOptions = {}): Promise<boolean> {
  if (!options.ignoreOptOut && (await isSmsSuppressed(to))) {
    logger.info('SMS suppressed: recipient opted out', { to: to.slice(-4), bodyLength: body.length })
    return false
  }

  const provider = resolveSmsProvider()
  if (provider === 'sns') return sendViaSns(to, body)
  if (provider === 'twilio') return sendViaTwilio(to, body)
  // Warn rather than info: unlike email this is survivable, because routing
  // offers also reach the attorney in-app and by email. But a deployment that
  // believes it sends SMS and does not should be able to see that in the logs.
  logger.warn('SMS dropped: no SMS provider is configured', {
    to: to.slice(-4),
    bodyLength: body.length,
  })
  return false
}

/**
 * Warn at boot when SMS is unconfigured.
 *
 * This is a warning rather than a startup failure because the case-offer flow
 * degrades honestly without it — the offer still reaches the attorney in-app and
 * by email, only the ACCEPT/DECLINE-by-text shortcut is lost.
 *
 * It is easy to get wrong in exactly one direction: SNS needs an explicit
 * `SMS_PROVIDER=sns` because AWS credentials are ambient and cannot be detected,
 * so an EC2 host with a perfectly good instance role sends nothing until someone
 * sets that variable.
 */
export function checkSmsProviderConfig(): void {
  if (isSmsConfigured()) return
  logger.warn(
    'No SMS provider is configured. Set SMS_PROVIDER=sns (SNS is never auto-detected, since AWS credentials are ambient) or supply the three TWILIO_* variables. Routing offers will still deliver in-app and by email; reply-to-accept will not work.',
  )
}

/**
 * Send case routing offer SMS to attorney. Includes Accept/Decline instructions.
 */
export async function sendCaseOfferSms(
  attorneyId: string,
  introductionId: string,
  caseSummary: string,
  timeoutMinutes?: number
): Promise<boolean> {
  const attorney = await prisma.attorney.findUnique({
    where: { id: attorneyId },
    select: { phone: true, name: true }
  })
  if (!attorney?.phone) {
    logger.info('Attorney has no phone, skipping SMS', { attorneyId })
    return false
  }
  const phone = normalizePhone(attorney.phone)
  // Callers that enforce their own window (the tier routers) pass it; everyone
  // else gets the deadline the expiry sweep will actually apply.
  const timeout = timeoutMinutes ?? (await getCurrentAttorneyResponseDeadlineMinutes())
  const body = [
    `CaseIQ: New case routed to you.`,
    caseSummary,
    offerReplyInstruction(introductionId, timeout)
  ].join('\n')
  return sendSms(phone, body)
}

function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, '')
  if (p.length === 10) p = '1' + p
  return '+' + p
}
