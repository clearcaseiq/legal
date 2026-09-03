/**
 * SMS opt-out — the STOP the intake screen already promises.
 *
 * `IntakeWizardQuick` tells every claimant "Reply STOP to opt out" before it
 * takes their number. Until this module, nothing processed a STOP: the inbound
 * handler only recognised attorney ACCEPT/DECLINE replies and dropped
 * everything else, so a claimant who texted STOP got told to "Reply ACCEPT to
 * accept or DECLINE to decline the case" and kept receiving messages. Making a
 * promise the product does not keep is the TCPA exposure, not the texting.
 *
 * Two design points worth knowing:
 *
 * **Keyed on the phone number, not a user.** A claimant's number frequently
 * exists only on an `IntakeLead` with no `User` row at all — that is precisely
 * who the abandonment and report-ready texts go to. An opt-out attached to a
 * user id would silently fail to cover them.
 *
 * **One canonical key.** Five different phone normalizers already exist in this
 * repo and they disagree: `lib/phone.ts` yields E.164, `sms.ts` yields `+digits`,
 * `sms-inbound.ts` yields bare digits. An opt-out is worthless if the number
 * recorded on the way in does not match the number checked on the way out, so
 * both paths go through `optOutKey` here and nothing else.
 */
import { prisma } from './prisma'
import { logger } from './logger'

/**
 * The keyword sets carriers and the CTIA require to work. Recognised on their
 * own or with surrounding punctuation, because people text "STOP." and "stop!".
 */
const STOP_KEYWORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'OPTOUT', 'OPT-OUT']
const START_KEYWORDS = ['START', 'UNSTOP', 'YES-START', 'OPTIN', 'OPT-IN', 'RESUME']
const HELP_KEYWORDS = ['HELP', 'INFO']

export type SmsKeyword = 'stop' | 'start' | 'help'

/**
 * The reply sent when someone opts out.
 *
 * This one message is allowed — and expected — after a STOP; carriers treat a
 * single confirmation as part of honouring the request rather than a further
 * message. It is sent with the suppression deliberately bypassed.
 */
export const OPT_OUT_CONFIRMATION =
  'ClearCaseIQ: You are unsubscribed and will not receive further texts from us. Reply START to resume. For help, email support@clearcaseiq.com.'

export const OPT_IN_CONFIRMATION =
  'ClearCaseIQ: You are resubscribed and will receive case updates by text. Reply STOP to unsubscribe at any time.'

export const HELP_REPLY =
  'ClearCaseIQ sends updates about your injury case. Reply STOP to unsubscribe. Msg&data rates may apply. Support: support@clearcaseiq.com.'

/**
 * Normalize to the single key both the send and receive paths use.
 *
 * Returns null for anything that cannot be a dialable US number, so a malformed
 * value never becomes an opt-out row that silently matches nothing.
 */
export function optOutKey(phone: string | null | undefined): string | null {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  // Longer values are plausible international numbers; keep them rather than
  // dropping an opt-out on the floor.
  if (digits.length > 11 && digits.length <= 15) return `+${digits}`
  return null
}

/**
 * Recognise an opt-out keyword.
 *
 * Deliberately strict: only the keyword, optionally with punctuation. A message
 * that merely contains the word — "please stop calling me about the deposition"
 * — is a conversation, not an opt-out request, and unsubscribing them from case
 * updates because of it would be its own failure.
 */
export function parseSmsKeyword(body: string): SmsKeyword | null {
  const cleaned = (body || '')
    .trim()
    .replace(/^[\s.,!:;'"-]+|[\s.,!:;'"-]+$/g, '')
    .toUpperCase()
  if (!cleaned) return null
  if (STOP_KEYWORDS.includes(cleaned)) return 'stop'
  if (START_KEYWORDS.includes(cleaned)) return 'start'
  if (HELP_KEYWORDS.includes(cleaned)) return 'help'
  return null
}

/** Record that this number no longer wants texts. Idempotent. */
export async function recordSmsOptOut(phone: string, keyword?: string, source = 'inbound_sms'): Promise<boolean> {
  const key = optOutKey(phone)
  if (!key) {
    logger.warn('SMS opt-out ignored: unusable phone number', { tail: (phone || '').slice(-4) })
    return false
  }
  try {
    await prisma.smsOptOut.upsert({
      where: { phone: key },
      create: { phone: key, keyword: keyword ?? null, source, optedOutAt: new Date() },
      // A second STOP re-arms an opt-out that a later START had lifted.
      update: { keyword: keyword ?? null, source, optedOutAt: new Date(), optedInAt: null },
    })
    logger.info('SMS opt-out recorded', { tail: key.slice(-4), keyword: keyword ?? null, source })
    return true
  } catch (error: any) {
    logger.error('Failed to record SMS opt-out', { tail: key.slice(-4), error: error?.message })
    return false
  }
}

/** Record that this number wants texts again. */
export async function recordSmsOptIn(phone: string, keyword?: string): Promise<boolean> {
  const key = optOutKey(phone)
  if (!key) return false
  try {
    // Only touches an existing row: nobody who never opted out needs a record
    // saying they opted in.
    const updated = await prisma.smsOptOut.updateMany({
      where: { phone: key, optedInAt: null },
      data: { optedInAt: new Date(), keyword: keyword ?? null },
    })
    logger.info('SMS opt-in recorded', { tail: key.slice(-4), reversed: updated.count })
    return true
  } catch (error: any) {
    logger.error('Failed to record SMS opt-in', { tail: key.slice(-4), error: error?.message })
    return false
  }
}

/**
 * Whether outbound SMS to this number must be suppressed.
 *
 * Fails **closed** on a database error: not texting someone who might have
 * opted out is recoverable, texting someone who did is not.
 */
export async function isSmsSuppressed(phone: string): Promise<boolean> {
  const key = optOutKey(phone)
  if (!key) return false
  try {
    const row = await prisma.smsOptOut.findUnique({
      where: { phone: key },
      select: { optedInAt: true },
    })
    return !!row && row.optedInAt === null
  } catch (error: any) {
    logger.error('SMS suppression check failed; suppressing to be safe', {
      tail: key.slice(-4),
      error: error?.message,
    })
    return true
  }
}
