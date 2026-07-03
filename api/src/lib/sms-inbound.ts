/**
 * Shared inbound-SMS decision processing for attorney Accept/Decline replies.
 *
 * Both the Twilio webhook (application/x-www-form-urlencoded) and the Amazon SNS
 * webhook (two-way SMS delivered via an SNS topic) funnel through this so the
 * business logic — idempotency, attorney lookup, introduction/lead updates — is
 * defined once. Never throws; always returns a response code + message.
 */
import { prisma } from './prisma'
import { logger } from './logger'

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

function parseDecision(body: string): 'ACCEPTED' | 'DECLINED' | null {
  if (/^(ACCEPT|YES|Y)$/i.test(body)) return 'ACCEPTED'
  if (/^(DECLINE|NO|N|REJECT)$/i.test(body)) return 'DECLINED'
  return null
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

    const decision = parseDecision(body)
    if (!decision) {
      const result: InboundSmsResult = {
        processingStatus: 'ignored',
        responseCode: 200,
        responseMessage: 'Reply ACCEPT to accept or DECLINE to decline the case.',
      }
      await updateReceipt(receiptId, result)
      return result
    }

    const outcome = await prisma.$transaction(async (tx) => {
      const attorney = await tx.attorney.findFirst({
        where: { phone: { in: buildPhoneCandidates(from, normalizedFrom) } },
        select: { id: true, phone: true },
      })

      if (!attorney) {
        logger.warn('Inbound SMS: unknown phone', { from: from.slice(-4) })
        return {
          processingStatus: 'ignored' as const,
          responseCode: 200,
          responseMessage: 'Phone number not recognized. Please log in to CaseIQ to respond.',
        }
      }

      const intro = await tx.introduction.findFirst({
        where: { attorneyId: attorney.id, status: 'PENDING' },
        orderBy: [{ requestedAt: 'desc' }, { createdAt: 'desc' }],
        select: { id: true, assessmentId: true },
      })

      if (!intro) {
        return {
          attorneyId: attorney.id,
          processingStatus: 'ignored' as const,
          responseCode: 200,
          responseMessage: 'No pending case offer found. It may have expired.',
        }
      }

      const introUpdate = await tx.introduction.updateMany({
        where: { id: intro.id, status: 'PENDING' },
        data: { status: decision, respondedAt: new Date() },
      })

      if (introUpdate.count === 0) {
        return {
          attorneyId: attorney.id,
          introductionId: intro.id,
          processingStatus: 'ignored' as const,
          responseCode: 200,
          responseMessage: 'This case offer was already updated. View details in CaseIQ.',
        }
      }

      let leadSubmissionId: string | null = null
      const lead = await tx.leadSubmission.findUnique({
        where: { assessmentId: intro.assessmentId },
        select: { id: true, assignmentType: true },
      })
      if (lead) {
        leadSubmissionId = lead.id
        await tx.leadSubmission.update({
          where: { id: lead.id },
          data: {
            status: decision === 'ACCEPTED' ? 'contacted' : 'rejected',
            assignedAttorneyId: decision === 'ACCEPTED' ? attorney.id : null,
            assignmentType: decision === 'ACCEPTED' ? 'exclusive' : lead.assignmentType,
            ...(decision === 'ACCEPTED' ? { lastContactAt: new Date() } : {}),
          },
        })
      }

      return {
        attorneyId: attorney.id,
        decision,
        introductionId: intro.id,
        leadSubmissionId,
        processingStatus: 'processed' as const,
        responseCode: 200,
        responseMessage:
          decision === 'ACCEPTED'
            ? 'You have accepted this case. View details in CaseIQ.'
            : 'You have declined this case.',
      }
    })

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
