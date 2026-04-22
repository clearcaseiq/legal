/**
 * SMS webhook for attorney Accept/Decline replies.
 * Twilio POSTs here when an attorney replies to a case routing SMS.
 * Configure Twilio: Messaging > Phone Numbers > Webhook URL = https://your-api.com/v1/sms/webhook
 */
import express from 'express'
import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'

const router = Router()

// Twilio sends application/x-www-form-urlencoded
router.use(express.urlencoded({ extended: false }))

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

function twimlMessage(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
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
      data: {
        ...data,
        processedAt: new Date(),
      },
    })
  } catch (error: any) {
    logger.warn('SMS webhook: failed to update receipt', {
      receiptId,
      error: error?.message,
    })
  }
}

router.post('/webhook', async (req, res) => {
  let receiptId: string | null = null
  try {
    const from = req.body?.From as string
    const rawBody = req.body?.Body as string
    const body = rawBody?.trim()
    const messageSid = (req.body?.MessageSid as string | undefined)?.trim()
    const normalizedFrom = from ? normalizePhone(from) : ''

    if (messageSid) {
      try {
        const receipt = await prisma.smsWebhookReceipt.create({
          data: {
            messageSid,
            requestId: (req as any).id ?? null,
            fromPhone: from || null,
            normalizedFrom: normalizedFrom || null,
            messageBody: body || null,
          },
        })
        receiptId = receipt.id
      } catch (error: any) {
        if (error?.code === 'P2002') {
          const existingReceipt = await prisma.smsWebhookReceipt.findUnique({
            where: { messageSid },
          })
          const duplicateMessage = existingReceipt?.responseMessage || 'This SMS reply was already processed. View details in CaseIQ.'
          res.status(existingReceipt?.responseCode || 200).send(twimlMessage(duplicateMessage))
          return
        }
        throw error
      }
    }

    if (!from || !body) {
      await updateReceipt(receiptId, {
        processingStatus: 'ignored',
        responseCode: 400,
        responseMessage: 'Missing From or Body',
      })
      res.status(400).send('Missing From or Body')
      return
    }

    const decision = parseDecision(body)

    if (!decision) {
      const responseMessage = 'Reply ACCEPT to accept or DECLINE to decline the case.'
      await updateReceipt(receiptId, {
        processingStatus: 'ignored',
        responseCode: 200,
        responseMessage,
      })
      res.status(200).send(twimlMessage(responseMessage))
      return
    }

    const outcome = await prisma.$transaction(async (tx) => {
      const attorney = await tx.attorney.findFirst({
        where: {
          phone: {
            in: buildPhoneCandidates(from, normalizedFrom),
          },
        },
        select: { id: true, phone: true },
      })

      if (!attorney) {
        logger.warn('SMS webhook: unknown phone', { from: from.slice(-4) })
        return {
          processingStatus: 'ignored' as const,
          responseCode: 200,
          responseMessage: 'Phone number not recognized. Please log in to CaseIQ to respond.',
        }
      }

      const intro = await tx.introduction.findFirst({
        where: {
          attorneyId: attorney.id,
          status: 'PENDING',
        },
        orderBy: [{ requestedAt: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          assessmentId: true,
        },
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
        where: {
          id: intro.id,
          status: 'PENDING',
        },
        data: {
          status: decision,
          respondedAt: new Date(),
        },
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

    logger.info('SMS decision received', {
      attorneyId: outcome.attorneyId,
      introductionId: outcome.introductionId,
      decision: outcome.decision,
      messageSid,
    })

    await updateReceipt(receiptId, outcome)
    res.status(outcome.responseCode).send(twimlMessage(outcome.responseMessage))
  } catch (error: any) {
    await updateReceipt(receiptId, {
      processingStatus: 'failed',
      responseCode: 500,
      responseMessage: 'Internal error',
      errorMessage: error.message,
    })
    logger.error('SMS webhook error', { error: error.message })
    res.status(500).send('Internal error')
  }
})

export default router
