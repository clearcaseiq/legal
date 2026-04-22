/**
 * SMS service for case routing notifications.
 * Supports Twilio (primary) with optional OpenClaw/webhook integration.
 * When attorney is routed a case, sends SMS with Accept/Decline instructions.
 */
import { prisma } from './prisma'
import { logger } from './logger'

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

export function isSmsConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER)
}

/**
 * Send SMS to a phone number. Uses Twilio when configured.
 */
export async function sendSms(to: string, body: string): Promise<boolean> {
  const client = getTwilioClient()
  const from = process.env.TWILIO_PHONE_NUMBER
  const normalizedTo = normalizePhone(to)
  if (!client || !from) {
    logger.info('SMS not configured (Twilio). Skipping send.', { to: to.slice(-4), bodyLength: body.length })
    return false
  }
  try {
    await client.messages.create({ body, from, to: normalizedTo })
    logger.info('SMS sent', { to: to.slice(-4) })
    return true
  } catch (err: any) {
    logger.error('SMS send failed', { error: err.message, to: to.slice(-4) })
    return false
  }
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
  const timeout = timeoutMinutes ?? 2
  const body = [
    `CaseIQ: New case routed to you.`,
    caseSummary,
    `Reply ACCEPT to accept or DECLINE to decline. (${timeout} min)`
  ].join('\n')
  return sendSms(phone, body)
}

function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, '')
  if (p.length === 10) p = '1' + p
  return '+' + p
}
