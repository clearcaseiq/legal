import { Router } from 'express'
import Stripe from 'stripe'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../lib/auth'
import { logger } from '../lib/logger'
import { ENV } from '../env'

const router = Router()
const db = prisma as any

function getStripe() {
  if (!ENV.STRIPE_SECRET_KEY) {
    throw Object.assign(new Error('Stripe is not configured'), { statusCode: 503 })
  }
  return new Stripe(ENV.STRIPE_SECRET_KEY)
}

function webUrl(path: string) {
  return `${ENV.WEB_URL.replace(/\/$/, '')}${path}`
}

function toCents(amount: number) {
  return Math.round(Number(amount) * 100)
}

function fromCents(amount: number | null | undefined) {
  return amount == null ? null : amount / 100
}

function stripeError(res: any, error: any, fallback = 'Stripe request failed') {
  const status = error?.statusCode || 500
  const message = error?.message || fallback
  logger.error(fallback, { error: message, status })
  return res.status(status).json({ error: message })
}

async function getAttorneyForUser(req: AuthRequest) {
  if (!req.user?.email) return null
  return db.attorney.findFirst({
    where: { email: req.user.email },
    include: { attorneyProfile: true },
  })
}

async function ensureAttorneyProfile(attorneyId: string) {
  return db.attorneyProfile.upsert({
    where: { attorneyId },
    update: {},
    create: { attorneyId },
  })
}

async function getOrCreateStripeCustomer(attorney: any, stripe: any) {
  const profile = attorney.attorneyProfile || await ensureAttorneyProfile(attorney.id)
  if (profile.stripeCustomerId) return profile.stripeCustomerId

  const customer = await stripe.customers.create({
    email: attorney.email || undefined,
    name: attorney.name || undefined,
    metadata: { attorneyId: attorney.id },
  })

  await db.attorneyProfile.update({
    where: { attorneyId: attorney.id },
    data: { stripeCustomerId: customer.id },
  })

  return customer.id
}

async function canAccessInvoice(req: AuthRequest, invoice: any) {
  const assessment = invoice.assessment
  if (assessment?.userId && assessment.userId === req.user?.id) return true

  const attorney = await getAttorneyForUser(req)
  if (!attorney) return false

  const lead = assessment?.leadSubmission
  if (lead?.assignedAttorneyId === attorney.id) return true

  const intro = await db.introduction.findFirst({
    where: { assessmentId: invoice.assessmentId, attorneyId: attorney.id },
    select: { id: true },
  })

  return Boolean(intro)
}

router.post('/invoices/:invoiceId/checkout-session', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const stripe = getStripe()
    const invoice = await db.billingInvoice.findUnique({
      where: { id: req.params.invoiceId },
      include: {
        assessment: {
          include: {
            user: { select: { email: true, firstName: true, lastName: true } },
            leadSubmission: true,
          },
        },
      },
    })

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' })
    if (!(await canAccessInvoice(req, invoice))) return res.status(403).json({ error: 'Not authorized to pay this invoice' })
    if (invoice.status === 'paid') return res.status(409).json({ error: 'Invoice is already paid' })
    if (!invoice.amount || invoice.amount <= 0) return res.status(400).json({ error: 'Invoice amount must be greater than zero' })

    const successUrl = req.body?.successUrl || webUrl('/payment/success?session_id={CHECKOUT_SESSION_ID}')
    const cancelUrl = req.body?.cancelUrl || webUrl(`/payment/cancel?invoiceId=${invoice.id}`)
    const metadata = {
      kind: 'case_invoice',
      invoiceId: invoice.id,
      assessmentId: invoice.assessmentId,
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      client_reference_id: invoice.id,
      customer_email: invoice.assessment?.user?.email || undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      payment_intent_data: { metadata },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: toCents(invoice.amount),
            product_data: {
              name: invoice.invoiceNumber ? `Case invoice ${invoice.invoiceNumber}` : 'Case invoice',
              description: invoice.notes || undefined,
            },
          },
        },
      ],
    })

    await db.billingInvoice.update({
      where: { id: invoice.id },
      data: {
        stripeCheckoutSessionId: session.id,
        stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
        stripePaymentStatus: session.payment_status,
      },
    })

    res.json({ checkoutUrl: session.url, sessionId: session.id })
  } catch (error: any) {
    return stripeError(res, error, 'Failed to create invoice checkout session')
  }
})

router.post('/platform/subscription-checkout-session', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const stripe = getStripe()
    const attorney = await getAttorneyForUser(req)
    if (!attorney) return res.status(403).json({ error: 'Attorney profile not found' })

    const priceId = req.body?.priceId || ENV.STRIPE_PLATFORM_SUBSCRIPTION_PRICE_ID
    if (!priceId) return res.status(400).json({ error: 'Stripe subscription price is not configured' })

    const customerId = await getOrCreateStripeCustomer(attorney, stripe)
    const metadata = { kind: 'attorney_subscription', attorneyId: attorney.id }
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      success_url: req.body?.successUrl || webUrl('/payment/success?session_id={CHECKOUT_SESSION_ID}'),
      cancel_url: req.body?.cancelUrl || webUrl('/payment/cancel?type=subscription'),
      metadata,
      subscription_data: { metadata },
      line_items: [{ price: priceId, quantity: 1 }],
    })

    await db.platformPayment.create({
      data: {
        attorneyId: attorney.id,
        type: 'subscription',
        status: 'checkout_created',
        stripeCustomerId: customerId,
        stripeCheckoutSessionId: session.id,
        stripePriceId: priceId,
      },
    })

    res.json({ checkoutUrl: session.url, sessionId: session.id })
  } catch (error: any) {
    return stripeError(res, error, 'Failed to create subscription checkout session')
  }
})

router.post('/platform/lead-credit-checkout-session', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const stripe = getStripe()
    const attorney = await getAttorneyForUser(req)
    if (!attorney) return res.status(403).json({ error: 'Attorney profile not found' })

    const customerId = await getOrCreateStripeCustomer(attorney, stripe)
    const priceId = req.body?.priceId || ENV.STRIPE_LEAD_CREDIT_PRICE_ID
    const amount = Number(req.body?.amount || 0)
    const lineItem = priceId
      ? { price: priceId, quantity: Number(req.body?.quantity || 1) }
      : {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: toCents(amount),
            product_data: { name: 'CaseIQ lead credits' },
          },
        }

    if (!priceId && (!amount || amount <= 0)) {
      return res.status(400).json({ error: 'Provide a Stripe priceId or a positive amount' })
    }

    const metadata = { kind: 'lead_credit', attorneyId: attorney.id }
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      success_url: req.body?.successUrl || webUrl('/payment/success?session_id={CHECKOUT_SESSION_ID}'),
      cancel_url: req.body?.cancelUrl || webUrl('/payment/cancel?type=lead_credit'),
      metadata,
      payment_intent_data: { metadata },
      line_items: [lineItem],
    })

    await db.platformPayment.create({
      data: {
        attorneyId: attorney.id,
        type: 'lead_credit',
        amount: priceId ? null : amount,
        status: 'checkout_created',
        stripeCustomerId: customerId,
        stripeCheckoutSessionId: session.id,
        stripePriceId: priceId || null,
      },
    })

    res.json({ checkoutUrl: session.url, sessionId: session.id })
  } catch (error: any) {
    return stripeError(res, error, 'Failed to create lead-credit checkout session')
  }
})

router.post('/connect/account-link', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const stripe = getStripe()
    const attorney = await getAttorneyForUser(req)
    if (!attorney) return res.status(403).json({ error: 'Attorney profile not found' })

    const profile = attorney.attorneyProfile || await ensureAttorneyProfile(attorney.id)
    let accountId = profile.stripeConnectAccountId

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: attorney.email || undefined,
        business_type: 'company',
        metadata: { attorneyId: attorney.id },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })
      accountId = account.id
      await db.attorneyProfile.update({
        where: { attorneyId: attorney.id },
        data: { stripeConnectAccountId: accountId },
      })
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: req.body?.refreshUrl || webUrl('/payment/connect/refresh'),
      return_url: req.body?.returnUrl || webUrl('/payment/connect/return'),
    })

    res.json({ url: accountLink.url, accountId })
  } catch (error: any) {
    return stripeError(res, error, 'Failed to create Stripe Connect account link')
  }
})

router.get('/connect/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const stripe = getStripe()
    const attorney = await getAttorneyForUser(req)
    if (!attorney) return res.status(403).json({ error: 'Attorney profile not found' })

    const accountId = attorney.attorneyProfile?.stripeConnectAccountId
    if (!accountId) return res.json({ connected: false })

    const account = await stripe.accounts.retrieve(accountId)
    await db.attorneyProfile.update({
      where: { attorneyId: attorney.id },
      data: {
        stripeConnectChargesEnabled: Boolean(account.charges_enabled),
        stripeConnectPayoutsEnabled: Boolean(account.payouts_enabled),
      },
    })

    res.json({
      connected: true,
      accountId,
      chargesEnabled: Boolean(account.charges_enabled),
      payoutsEnabled: Boolean(account.payouts_enabled),
      detailsSubmitted: Boolean(account.details_submitted),
    })
  } catch (error: any) {
    return stripeError(res, error, 'Failed to load Stripe Connect status')
  }
})

async function recordCaseInvoicePayment(session: any) {
  const invoiceId = session.metadata?.invoiceId
  if (!invoiceId) return

  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
  const invoice = await db.billingInvoice.findUnique({ where: { id: invoiceId } })
  if (!invoice) return

  const amount = fromCents(session.amount_total) ?? invoice.amount
  await db.billingInvoice.update({
    where: { id: invoice.id },
    data: {
      status: session.payment_status === 'paid' ? 'paid' : invoice.status,
      paidAt: session.payment_status === 'paid' ? new Date() : invoice.paidAt,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId || null,
      stripeCustomerId: customerId || null,
      stripePaymentStatus: session.payment_status,
    },
  })

  const existingPayment = await db.billingPayment.findFirst({
    where: {
      OR: [
        { stripeCheckoutSessionId: session.id },
        ...(paymentIntentId ? [{ stripePaymentIntentId: paymentIntentId }] : []),
      ],
    },
  })

  if (!existingPayment && session.payment_status === 'paid') {
    await db.billingPayment.create({
      data: {
        assessmentId: invoice.assessmentId,
        amount,
        method: 'card',
        processor: 'stripe',
        reference: session.id,
        notes: 'Paid through Stripe Checkout',
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId || null,
        stripeCustomerId: customerId || null,
      },
    })
  }
}

async function recordPlatformCheckout(session: any) {
  const attorneyId = session.metadata?.attorneyId
  const kind = session.metadata?.kind
  if (!attorneyId || !kind) return

  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
  const amount = fromCents(session.amount_total)

  const existing = await db.platformPayment.findFirst({ where: { stripeCheckoutSessionId: session.id } })
  const data = {
    attorneyId,
    type: kind === 'attorney_subscription' ? 'subscription' : 'lead_credit',
    amount,
    status: session.payment_status || 'completed',
    stripeCustomerId: customerId || null,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId || null,
    stripeSubscriptionId: subscriptionId || null,
    metadata: JSON.stringify(session.metadata || {}),
  }

  if (existing) {
    await db.platformPayment.update({ where: { id: existing.id }, data })
  } else {
    await db.platformPayment.create({ data })
  }

  if (kind === 'attorney_subscription' && subscriptionId) {
    await db.attorneyProfile.update({
      where: { attorneyId },
      data: {
        stripeCustomerId: customerId || undefined,
        stripeSubscriptionId: subscriptionId,
        stripeSubscriptionStatus: 'active',
        subscriptionActive: true,
      },
    })
  }

  if (kind === 'lead_credit' && amount && session.payment_status === 'paid') {
    await db.attorneyProfile.upsert({
      where: { attorneyId },
      update: { accountBalance: { increment: amount }, stripeCustomerId: customerId || undefined },
      create: { attorneyId, accountBalance: amount, stripeCustomerId: customerId || undefined },
    })
  }
}

async function syncSubscription(subscription: any) {
  const attorneyId = subscription.metadata?.attorneyId
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
  const priceId = subscription.items.data[0]?.price?.id
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end
    ? new Date(subscription.items.data[0].current_period_end * 1000)
    : null
  const active = ['active', 'trialing'].includes(subscription.status)

  const where = attorneyId
    ? { attorneyId }
    : customerId
      ? { stripeCustomerId: customerId }
      : null

  if (!where) return

  await db.attorneyProfile.updateMany({
    where,
    data: {
      stripeCustomerId: customerId || undefined,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
      stripeSubscriptionPriceId: priceId || undefined,
      stripeCurrentPeriodEnd: currentPeriodEnd,
      subscriptionActive: active,
    },
  })
}

router.post('/stripe-webhook', async (req, res) => {
  if (!ENV.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Stripe webhook secret is not configured' })
  }

  const stripe = getStripe()
  const signature = req.headers['stripe-signature']
  if (!signature) return res.status(400).json({ error: 'Missing Stripe signature' })

  let event: any
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, ENV.STRIPE_WEBHOOK_SECRET)
  } catch (error: any) {
    logger.warn('Invalid Stripe webhook signature', { error: error.message })
    return res.status(400).json({ error: 'Invalid Stripe signature' })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any
      if (session.metadata?.kind === 'case_invoice') {
        await recordCaseInvoicePayment(session)
      } else if (session.metadata?.kind === 'attorney_subscription' || session.metadata?.kind === 'lead_credit') {
        await recordPlatformCheckout(session)
      }
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await syncSubscription(event.data.object as any)
    }

    res.json({ received: true })
  } catch (error: any) {
    logger.error('Failed to process Stripe webhook', { type: event.type, error: error.message })
    res.status(500).json({ error: 'Failed to process Stripe webhook' })
  }
})

export default router
