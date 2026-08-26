/**
 * Shared inbound-SMS decision processing for attorney Accept/Decline replies.
 *
 * Both the Twilio webhook (application/x-www-form-urlencoded) and the Amazon SNS
 * webhook (two-way SMS delivered via an SNS topic) funnel through this so that
 * idempotency, attorney lookup and offer correlation are defined once. Never
 * throws; always returns a response code + message.
 *
 * The decision itself belongs to `attorneyAcceptCase` / `attorneyDeclineCase`.
 * This module used to write the introduction and the lead directly, which meant
 * a reply-to-accept skipped everything those routines do: the case was assigned
 * but never locked, so it kept escalating to new attorneys and stayed claimable
 * by a second one; the claimant was never told anyone had taken it; and no
 * analytics, reputation, decision memory, coach tasks or billing were recorded.
 * SMS is the primary channel for tier-routed offers, so that was the ordinary
 * outcome rather than an edge case.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { attorneyAcceptCase, attorneyDeclineCase } from './routing-lifecycle'
import { selectOfferForReply } from './offer-reference'

export interface InboundSmsResult {
  processingStatus: 'processed' | 'ignored' | 'failed'
  responseCode: number
  responseMessage: string
  attorneyId?: string | null
  decision?: 'ACCEPTED' | 'DECLINED' | null
  introductionId?: string | null
  leadSubmissionId?: string | null
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * Read the decision and, when the attorney quoted it, the offer reference code
 * from the outbound message. The code is optional so replies to offers sent
 * before codes existed, and bare "YES" replies from attorneys with a single open
 * offer, keep working.
 */
function parseDecision(body: string): { decision: 'ACCEPTED' | 'DECLINED'; code: string | null } | null {
  const match = /^(ACCEPT|YES|Y|DECLINE|NO|N|REJECT)\b[\s.,:-]*([A-Za-z0-9]+)?[\s.!]*$/i.exec(body.trim())
  if (!match) return null
  const decision = /^(ACCEPT|YES|Y)$/i.test(match[1]) ? 'ACCEPTED' : 'DECLINED'
  return { decision, code: match[2] ? match[2].toUpperCase() : null }
}

function buildPhoneCandidates(from: string, normalizedFrom: string): string[] {
  const values = new Set<string>()
  if (from) values.add(from.trim())
  if (normalizedFrom) {
    values.add(normalizedFrom)
    values.add(`+${normalizedFrom}`)
    if (normalizedFrom.length === 10) {
      values.add(`1${normalizedFrom}`)
      values.add(`+1${normalizedFrom}`)
    }
    if (normalizedFrom.length === 11 && normalizedFrom.startsWith('1')) {
      values.add(`+${normalizedFrom}`)
      values.add(normalizedFrom.slice(1))
    }
  }
  return [...values].filter(Boolean)
}

async function updateReceipt(
  receiptId: string | null,
  data: {
    attorneyId?: string | null
    decision?: string | null
    errorMessage?: string | null
    introductionId?: string | null
    leadSubmissionId?: string | null
    processingStatus: 'processed' | 'ignored' | 'failed'
    responseCode?: number | null
    responseMessage?: string | null
  },
) {
  if (!receiptId) return
  try {
    await prisma.smsWebhookReceipt.update({
      where: { id: receiptId },
      data: { ...data, processedAt: new Date() },
    })
  } catch (error: any) {
    logger.warn('Inbound SMS: failed to update receipt', { receiptId, error: error?.message })
  }
}

/**
 * Process one inbound SMS reply. Handles idempotency (via messageId), decision
 * parsing, and updating the attorney's pending introduction and lead.
 */
export async function processInboundSmsDecision(input: {
  fromPhone: string
  body: string
  messageId?: string | null
}): Promise<InboundSmsResult> {
  let receiptId: string | null = null
  try {
    const from = input.fromPhone
    const body = (input.body || '').trim()
    const messageSid = input.messageId?.trim() || null
    const normalizedFrom = from ? normalizePhone(from) : ''

    if (messageSid) {
      try {
        const receipt = await prisma.smsWebhookReceipt.create({
          data: {
            messageSid,
            fromPhone: from || null,
            normalizedFrom: normalizedFrom || null,
            messageBody: body || null,
          },
        })
        receiptId = receipt.id
      } catch (error: any) {
        // A repeat delivery of the same message: replay the stored response
        // instead of processing the decision twice.
        if (error?.code === 'P2002') {
          const existing = await prisma.smsWebhookReceipt.findUnique({ where: { messageSid } })
          return {
            processingStatus: 'ignored',
            responseCode: existing?.responseCode || 200,
            responseMessage: existing?.responseMessage || 'This SMS reply was already processed. View details in CaseIQ.',
          }
        }
        throw error
      }
    }

    if (!from || !body) {
      const result: InboundSmsResult = {
        processingStatus: 'ignored',
        responseCode: 400,
        responseMessage: 'Missing sender or message body.',
      }
      await updateReceipt(receiptId, result)
      return result
    }

    const parsed = parseDecision(body)
    if (!parsed) {
      const result: InboundSmsResult = {
        processingStatus: 'ignored',
        responseCode: 200,
        responseMessage: 'Reply ACCEPT to accept or DECLINE to decline the case.',
      }
      await updateReceipt(receiptId, result)
      return result
    }
    const { decision, code } = parsed

    const attorney = await prisma.attorney.findFirst({
      where: { phone: { in: buildPhoneCandidates(from, normalizedFrom) } },
      select: { id: true },
    })
    if (!attorney) {
      logger.warn('Inbound SMS: unknown phone', { from: from.slice(-4) })
      const result: InboundSmsResult = {
        processingStatus: 'ignored',
        responseCode: 200,
        responseMessage: 'Phone number not recognized. Please log in to CaseIQ to respond.',
      }
      await updateReceipt(receiptId, result)
      return result
    }

    const pendingOffers = await prisma.introduction.findMany({
      where: { attorneyId: attorney.id, status: 'PENDING' },
      orderBy: [{ requestedAt: 'desc' }, { createdAt: 'desc' }],
      select: { id: true },
    })

    const selection = selectOfferForReply(pendingOffers, code)
    if (!selection.ok) {
      const result: InboundSmsResult = {
        attorneyId: attorney.id,
        processingStatus: 'ignored',
        responseCode: 200,
        responseMessage:
          selection.reason === 'none'
            ? 'No pending case offer found. It may have expired.'
            : selection.reason === 'unknown_code'
              ? 'That reference code does not match an open offer. Check the code or respond in CaseIQ.'
              : 'You have more than one open offer. Reply with the reference code from the message, or respond in CaseIQ.',
      }
      await updateReceipt(receiptId, result)
      return result
    }

    const introductionId = selection.introductionId
    const decided =
      decision === 'ACCEPTED'
        ? await attorneyAcceptCase(introductionId, attorney.id)
        : await attorneyDeclineCase(introductionId, attorney.id, 'declined_by_sms')

    if (!decided.success) {
      const result: InboundSmsResult = {
        attorneyId: attorney.id,
        introductionId,
        processingStatus: 'ignored',
        responseCode: 200,
        // The routine's own wording covers the cases worth distinguishing here:
        // already responded, and lost the race for a case someone else took.
        responseMessage: `${decided.error || 'This case offer could not be updated.'} View details in CaseIQ.`,
      }
      await updateReceipt(receiptId, result)
      return result
    }

    const lead = await prisma.leadSubmission.findFirst({
      where: { assessment: { introductions: { some: { id: introductionId } } } },
      select: { id: true },
    })

    const outcome: InboundSmsResult = {
      attorneyId: attorney.id,
      decision,
      introductionId,
      leadSubmissionId: lead?.id ?? null,
      processingStatus: 'processed',
      responseCode: 200,
      responseMessage:
        decision === 'ACCEPTED'
          ? 'You have accepted this case. View details in CaseIQ.'
          : 'You have declined this case.',
    }

    logger.info('Inbound SMS decision processed', {
      attorneyId: outcome.attorneyId,
      introductionId: outcome.introductionId,
      decision: outcome.decision,
      messageId: messageSid,
    })

    await updateReceipt(receiptId, outcome)
    return outcome
  } catch (error: any) {
    await updateReceipt(receiptId, {
      processingStatus: 'failed',
      responseCode: 500,
      responseMessage: 'Internal error',
      errorMessage: error?.message,
    })
    logger.error('Inbound SMS processing error', { error: error?.message })
    return { processingStatus: 'failed', responseCode: 500, responseMessage: 'Internal error' }
  }
}
