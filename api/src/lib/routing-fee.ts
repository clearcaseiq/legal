import { prisma } from './prisma'
import { logger } from './logger'
import { ENV } from '../env'
import { ATTORNEY_SELF_SOURCE } from './attorney-case-factory'
import { getCaseRoutingFee, getMatchingRules } from './matching-rules-config'
import { getStripe } from './stripe'

const db = prisma as any

const PAID_STATUSES = ['paid', 'succeeded', 'complete', 'completed', 'no_payment_required']

/** Whether accepting this lead costs the attorney a routing fee they must pay first. */
export async function isRoutingFeeDue(lead: { sourceType?: string | null }): Promise<boolean> {
  if (lead.sourceType === ATTORNEY_SELF_SOURCE) return false
  const rules = await getMatchingRules()
  if (!getCaseRoutingFee(rules)) return false
  return !!rules.routingFeePaymentsEnabled && !!ENV.STRIPE_SECRET_KEY
}

function feeRowsForLead(attorneyId: string, leadId: string) {
  return db.platformPayment.findMany({
    where: {
      attorneyId,
      type: { in: ['routing_fee', 'routing_fee_subscription_credit'] },
      metadata: { contains: `"leadId":"${leadId}"` },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * The attorney has paid (or spent an included case) for this lead. Asks Stripe
 * directly about open checkouts, because the attorney returns from Checkout
 * before the webhook usually lands.
 */
export async function hasSettledRoutingFee(attorneyId: string, leadId: string): Promise<boolean> {
  const rows: any[] = await feeRowsForLead(attorneyId, leadId)
  if (rows.some((row) => row.type === 'routing_fee_subscription_credit' && row.status === 'applied')) return true
  if (rows.some((row) => row.type === 'routing_fee' && PAID_STATUSES.includes(String(row.status)))) return true

  const openCheckouts = rows.filter(
    (row) => row.type === 'routing_fee' && row.status === 'checkout_created' && row.stripeCheckoutSessionId,
  )
  if (openCheckouts.length === 0 || !ENV.STRIPE_SECRET_KEY) return false

  const stripe = getStripe()
  for (const row of openCheckouts) {
    try {
      const session = await stripe.checkout.sessions.retrieve(row.stripeCheckoutSessionId)
      if (session?.payment_status !== 'paid') continue
      const paymentIntentId =
        typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
      await db.platformPayment.update({
        where: { id: row.id },
        data: { status: 'paid', stripePaymentIntentId: paymentIntentId || null },
      })
      return true
    } catch (err: unknown) {
      logger.warn('Failed to confirm routing fee checkout with Stripe', {
        attorneyId,
        leadId,
        sessionId: row.stripeCheckoutSessionId,
        error: (err as Error).message,
      })
    }
  }
  return false
}

/**
 * Give back what the attorney paid for a lead they did not get: refund the
 * card payment, or return the included case to their subscription.
 */
export async function refundRoutingFee(
  attorneyId: string,
  leadId: string,
  reason: string,
): Promise<{ refunded: boolean }> {
  const rows: any[] = await feeRowsForLead(attorneyId, leadId)
  let refunded = false

  for (const row of rows) {
    try {
      if (row.type === 'routing_fee_subscription_credit' && row.status === 'applied') {
        let meta: Record<string, unknown> = {}
        try {
          meta = JSON.parse(row.metadata || '{}')
        } catch {
          meta = {}
        }
        await db.platformPayment.update({ where: { id: row.id }, data: { status: 'released' } })
        if (meta.remainingCasesAfterAcceptance !== undefined) {
          await db.attorneyProfile.update({
            where: { attorneyId },
            data: { subscriptionRemainingCases: { increment: 1 } },
          })
        }
        refunded = true
      } else if (row.type === 'routing_fee' && PAID_STATUSES.includes(String(row.status)) && row.stripePaymentIntentId) {
        await getStripe().refunds.create({
          payment_intent: row.stripePaymentIntentId,
          metadata: { attorneyId, leadId, reason },
        })
        await db.platformPayment.update({ where: { id: row.id }, data: { status: 'refunded' } })
        refunded = true
      }
    } catch (err: unknown) {
      logger.error('Failed to refund routing fee for a case the attorney did not get', {
        attorneyId,
        leadId,
        paymentId: row.id,
        reason,
        error: (err as Error).message,
      })
    }
  }

  if (refunded) logger.info('Routing fee refunded', { attorneyId, leadId, reason })
  return { refunded }
}
