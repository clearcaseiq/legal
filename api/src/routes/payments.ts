import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authMiddleware, type AuthRequest } from '../lib/auth'
import { logger } from '../lib/logger'
import { ENV } from '../env'
import { getAttorneySubscriptionTier, getCaseRoutingPricingForClaimType, getMatchingRules } from '../lib/matching-rules-config'
import {
  getStripe,
  webUrl,
  toCents,
  fromCents,
  toStripeMetadataValue,
  parseJsonMaybe,
  FEATURED_BOOST_PRICES,
} from '../lib/stripe'

const router = Router()
const db = prisma as any

function getPricingClaimType(assessment: any) {
  const facts = parseJsonMaybe(assessment?.facts) || {}
  const prediction = parseJsonMaybe(assessment?.prediction) || {}
  return (
    assessment?.validatedClaimType ||
    assessment?.claimType ||
    facts?.validatedClaimType ||
    facts?.caseType ||
    facts?.incident?.type ||
    prediction?.claimType ||
    prediction?.caseType ||
    null
  )
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

async function getDefaultPaymentMethodId(stripe: any, customerId: string) {
  const customer = await stripe.customers.retrieve(customerId, {
    expand: ['invoice_settings.default_payment_method'],
  })
  if (customer.deleted) return null

  const defaultPaymentMethod = customer.invoice_settings?.default_payment_method
  if (!defaultPaymentMethod) return null
  return typeof defaultPaymentMethod === 'string' ? defaultPaymentMethod : defaultPaymentMethod.id
}

async function getAuthorizedLeadForAttorney(req: AuthRequest, leadId: string) {
  const attorney = await getAttorneyForUser(req)
  if (!attorney) return { error: { status: 403, message: 'Attorney profile not found' } }

  const lead = await db.leadSubmission.findUnique({
    where: { id: leadId },
    include: { assessment: true },
  })
  if (!lead) return { error: { status: 404, message: 'Lead not found' } }

  const intro = await db.introduction.findFirst({
    where: { assessmentId: lead.assessmentId, attorneyId: attorney.id },
    select: { id: true },
  })
  const isShared = lead.assignmentType === 'shared'
  const isAssigned = lead.assignedAttorneyId === attorney.id
  if (!isShared && !isAssigned && !intro) {
    return { error: { status: 403, message: 'Not authorized to access this lead' } }
  }

  // Guard against paying for a case already claimed by another attorney. routingLocked
  // is only set when a case is accepted, so a lock held by a different attorney means
  // the case is gone — never let a stale client start a routing-fee checkout for it.
  const claimedByOther =
    !!lead.routingLocked && !!lead.assignedAttorneyId && lead.assignedAttorneyId !== attorney.id
  if (claimedByOther) {
    return { error: { status: 409, message: 'This case has already been assigned to another attorney.' } }
  }

  return { attorney, lead }
}

async function applySubscriptionCaseCredit(attorney: any, lead: any) {
  const profile = attorney.attorneyProfile
  if (!profile?.subscriptionActive) return null

  const matchingRules = await getMatchingRules()
  const subscriptionTier = getAttorneySubscriptionTier(matchingRules, profile.subscriptionTier)
  if (!subscriptionTier) return null

  const metadata = {
    kind: 'routing_fee_subscription_credit',
    attorneyId: attorney.id,
    leadId: lead.id,
    assessmentId: lead.assessmentId,
    tierId: subscriptionTier.id,
    tierLabel: subscriptionTier.label,
  }
  const existingCredit = await db.platformPayment.findFirst({
    where: {
      attorneyId: attorney.id,
      type: 'routing_fee_subscription_credit',
      metadata: { contains: `"leadId":"${lead.id}"` },
    },
  })
  if (existingCredit) {
    return {
      status: 'subscription_applied',
      tierId: subscriptionTier.id,
      tierLabel: subscriptionTier.label,
      remainingCases: profile.subscriptionRemainingCases ?? null,
    }
  }

  if (subscriptionTier.includedCasesPerMonth == null) {
    await db.platformPayment.create({
      data: {
        attorneyId: attorney.id,
        type: 'routing_fee_subscription_credit',
        amount: 0,
        status: 'applied',
        stripeCustomerId: profile.stripeCustomerId || null,
        metadata: JSON.stringify(metadata),
      },
    })
    return {
      status: 'subscription_applied',
      tierId: subscriptionTier.id,
      tierLabel: subscriptionTier.label,
      remainingCases: null,
    }
  }

  const remainingCases = Number(profile.subscriptionRemainingCases ?? 0)
  if (remainingCases <= 0) return null

  const updatedProfile = await db.attorneyProfile.update({
    where: { attorneyId: attorney.id },
    data: { subscriptionRemainingCases: { decrement: 1 } },
  })
  await db.platformPayment.create({
    data: {
      attorneyId: attorney.id,
      type: 'routing_fee_subscription_credit',
      amount: 0,
      status: 'applied',
      stripeCustomerId: profile.stripeCustomerId || null,
      metadata: JSON.stringify({
        ...metadata,
        remainingCasesAfterAcceptance: updatedProfile.subscriptionRemainingCases,
      }),
    },
  })

  return {
    status: 'subscription_applied',
    tierId: subscriptionTier.id,
    tierLabel: subscriptionTier.label,
    remainingCases: updatedProfile.subscriptionRemainingCases,
  }
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

    const matchingRules = await getMatchingRules()
    const subscriptionTier = getAttorneySubscriptionTier(matchingRules, req.body?.tierId || 'starter')
    if (!subscriptionTier) return res.status(400).json({ error: 'Subscription tier is not available' })
    if (!subscriptionTier.monthlyPriceCents || subscriptionTier.monthlyPriceCents <= 0) {
      return res.status(400).json({ error: 'This subscription tier requires custom billing setup' })
    }

    const customerId = await getOrCreateStripeCustomer(attorney, stripe)
    const metadata = {
      kind: 'attorney_subscription',
      attorneyId: attorney.id,
      tierId: subscriptionTier.id,
      tierLabel: subscriptionTier.label,
      includedCasesPerMonth: toStripeMetadataValue(subscriptionTier.includedCasesPerMonth),
    }
    const priceId = req.body?.priceId || ENV.STRIPE_PLATFORM_SUBSCRIPTION_PRICE_ID
    const lineItem = priceId
      ? { price: priceId, quantity: 1 }
      : {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: subscriptionTier.monthlyPriceCents,
            recurring: { interval: 'month' as const },
            product_data: {
              name: `CaseIQ ${subscriptionTier.label} subscription`,
              description: subscriptionTier.description,
            },
          },
        }
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      success_url: req.body?.successUrl || webUrl('/payment/success?type=subscription&session_id={CHECKOUT_SESSION_ID}'),
      cancel_url: req.body?.cancelUrl || webUrl('/payment/cancel?type=subscription'),
      metadata,
      subscription_data: { metadata },
      line_items: [lineItem],
    })

    await db.platformPayment.create({
      data: {
        attorneyId: attorney.id,
        type: 'subscription',
        status: 'checkout_created',
        stripeCustomerId: customerId,
        stripeCheckoutSessionId: session.id,
        stripePriceId: priceId,
        metadata: JSON.stringify(metadata),
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

router.post('/payment-methods/setup-session', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const stripe = getStripe()
    const attorney = await getAttorneyForUser(req)
    if (!attorney) return res.status(403).json({ error: 'Attorney profile not found' })

    const customerId = await getOrCreateStripeCustomer(attorney, stripe)
    const metadata = { kind: 'attorney_payment_method', attorneyId: attorney.id }
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerId,
      payment_method_types: ['card'],
      success_url: req.body?.successUrl || webUrl('/payment/success?type=payment_method&session_id={CHECKOUT_SESSION_ID}'),
      cancel_url: req.body?.cancelUrl || webUrl('/payment/cancel?type=payment_method'),
      metadata,
      setup_intent_data: { metadata },
    })

    res.json({ checkoutUrl: session.url, sessionId: session.id })
  } catch (error: any) {
    return stripeError(res, error, 'Failed to create payment method setup session')
  }
})

router.post('/platform/routing-fee-session', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { leadId } = req.body || {}
    if (!leadId) return res.status(400).json({ error: 'leadId is required' })

    const auth = await getAuthorizedLeadForAttorney(req, leadId)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const { attorney, lead } = auth

    const matchingRules = await getMatchingRules()
    const claimType = getPricingClaimType(lead.assessment)
    const pricingTier = getCaseRoutingPricingForClaimType(matchingRules, claimType)
    if (!pricingTier || !pricingTier.enabled || pricingTier.priceCents <= 0) {
      return res.json({ status: 'not_required', amount: 0 })
    }

    const subscriptionCredit = await applySubscriptionCaseCredit(attorney, lead)
    if (subscriptionCredit) return res.json(subscriptionCredit)

    const metadata = {
      kind: 'routing_fee',
      attorneyId: attorney.id,
      leadId: lead.id,
      assessmentId: lead.assessmentId,
      tierId: pricingTier.id,
      tierLabel: pricingTier.label,
    }
    const amount = fromCents(pricingTier.priceCents)
    if (!matchingRules.routingFeePaymentsEnabled || !ENV.STRIPE_SECRET_KEY) {
      logger.warn('Routing fee payment bypassed', {
        attorneyId: attorney.id,
        leadId: lead.id,
        tierId: pricingTier.id,
        reason: !matchingRules.routingFeePaymentsEnabled ? 'routing_fee_payments_disabled' : 'stripe_not_configured',
      })
      await db.platformPayment.create({
        data: {
          attorneyId: attorney.id,
          type: 'routing_fee',
          amount,
          status: !matchingRules.routingFeePaymentsEnabled ? 'skipped_payments_disabled' : 'skipped_stripe_not_configured',
          metadata: JSON.stringify(metadata),
        },
      })
      return res.json({
        status: !matchingRules.routingFeePaymentsEnabled ? 'skipped_payments_disabled' : 'skipped_stripe_not_configured',
        amount,
      })
    }

    const stripe = getStripe()
    const customerId = await getOrCreateStripeCustomer(attorney, stripe)

    // Always send the attorney to hosted Stripe Checkout so they can review and
    // confirm the routing fee. When they already saved a default card (during
    // onboarding or later), Checkout surfaces and pre-selects it via
    // `saved_payment_method_options` + the customer's default_payment_method,
    // instead of silently charging off-session with no confirmation step.
    const successUrl = req.body?.successUrl || webUrl(`/payment/success?type=routing_fee&leadId=${encodeURIComponent(lead.id)}&session_id={CHECKOUT_SESSION_ID}`)
    const cancelUrl = req.body?.cancelUrl || webUrl(`/payment/cancel?type=routing_fee&leadId=${encodeURIComponent(lead.id)}`)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      payment_method_types: ['card'],
      // Surface the attorney's stored cards in Checkout so a saved default is
      // pre-selected. `allow_redisplay_filters` must include the saved card's
      // allow_redisplay value for it to appear; cards saved via our SetupIntent
      // flow are 'always', but include the full set so older/unspecified cards
      // still show. (We don't set `payment_method_save` here because it conflicts
      // with `payment_intent_data.setup_future_usage`, which already saves the card.)
      saved_payment_method_options: {
        allow_redisplay_filters: ['always', 'limited', 'unspecified'],
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      payment_intent_data: {
        setup_future_usage: 'off_session',
        metadata,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: pricingTier.priceCents,
            product_data: {
              name: `CaseIQ routing fee - ${pricingTier.label}`,
              description: pricingTier.description || 'Due when accepting this case.',
            },
          },
        },
      ],
    })

    await db.platformPayment.create({
      data: {
        attorneyId: attorney.id,
        type: 'routing_fee',
        amount,
        status: 'checkout_created',
        stripeCustomerId: customerId,
        stripeCheckoutSessionId: session.id,
        metadata: JSON.stringify(metadata),
      },
    })

    res.json({ status: 'checkout_required', checkoutUrl: session.url, sessionId: session.id })
  } catch (error: any) {
    return stripeError(res, error, 'Failed to create routing fee payment')
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

// Public, unauthenticated config for the frontend to initialize Stripe.js.
// Returns only the publishable key (safe to expose) so we don't need a separate
// build-time env var baked into the web bundle.
router.get('/config', (_req, res) => {
  res.json({
    publishableKey: ENV.STRIPE_PUBLISHABLE_KEY || null,
    enabled: Boolean(ENV.STRIPE_SECRET_KEY && ENV.STRIPE_PUBLISHABLE_KEY),
  })
})

// Creates a SetupIntent so the attorney can enter a card directly in-app with
// the Stripe Payment Element (no redirect to hosted Checkout). The resulting
// payment method is promoted to the customer default via the
// setup_intent.succeeded webhook.
router.post('/payment-methods/setup-intent', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const stripe = getStripe()
    const attorney = await getAttorneyForUser(req)
    if (!attorney) return res.status(403).json({ error: 'Attorney profile not found' })

    const customerId = await getOrCreateStripeCustomer(attorney, stripe)
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: { kind: 'attorney_payment_method', attorneyId: attorney.id },
    })

    res.json({ clientSecret: setupIntent.client_secret, customerId })
  } catch (error: any) {
    return stripeError(res, error, 'Failed to create card setup intent')
  }
})

// Whether the attorney has a saved default card on file. Powers the onboarding
// "add payment method" gate and lets the accept flow charge off-session instead
// of redirecting to hosted Checkout.
router.get('/payment-methods/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const stripeEnabled = Boolean(ENV.STRIPE_SECRET_KEY && ENV.STRIPE_PUBLISHABLE_KEY)
    if (!stripeEnabled) return res.json({ stripeEnabled: false, hasDefaultPaymentMethod: false })

    const attorney = await getAttorneyForUser(req)
    if (!attorney) return res.status(403).json({ error: 'Attorney profile not found' })

    const profile = attorney.attorneyProfile || (await ensureAttorneyProfile(attorney.id))
    const customerId = profile.stripeCustomerId
    if (!customerId) return res.json({ stripeEnabled: true, hasDefaultPaymentMethod: false })

    const stripe = getStripe()
    const paymentMethodId = await getDefaultPaymentMethodId(stripe, customerId)
    if (!paymentMethodId) return res.json({ stripeEnabled: true, hasDefaultPaymentMethod: false })

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)
    return res.json({
      stripeEnabled: true,
      hasDefaultPaymentMethod: true,
      brand: paymentMethod.card?.brand || null,
      last4: paymentMethod.card?.last4 || null,
    })
  } catch (error: any) {
    return stripeError(res, error, 'Failed to load payment method status')
  }
})

// After a card is entered via the embedded Payment Element, promote the newest
// card to the customer's default payment method right away. This makes the
// saved card usable for off-session charges immediately, without waiting on the
// setup_intent.succeeded webhook (which may not be forwarded in local/dev).
// Idempotent: if a default is already set it is returned unchanged.
router.post('/payment-methods/sync-default', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const stripe = getStripe()
    const attorney = await getAttorneyForUser(req)
    if (!attorney) return res.status(403).json({ error: 'Attorney profile not found' })

    const customerId = await getOrCreateStripeCustomer(attorney, stripe)
    let defaultPaymentMethodId = await getDefaultPaymentMethodId(stripe, customerId)

    if (!defaultPaymentMethodId) {
      const methods = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 10 })
      const newest = methods.data?.[0]
      if (newest) {
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: newest.id },
        })
        defaultPaymentMethodId = newest.id
      }
    }

    if (!defaultPaymentMethodId) return res.json({ hasDefaultPaymentMethod: false })

    const paymentMethod = await stripe.paymentMethods.retrieve(defaultPaymentMethodId)
    return res.json({
      hasDefaultPaymentMethod: true,
      brand: paymentMethod.card?.brand || null,
      last4: paymentMethod.card?.last4 || null,
    })
  } catch (error: any) {
    return stripeError(res, error, 'Failed to sync default payment method')
  }
})

// Stripe Customer Portal — lets an attorney manage/cancel their subscription,
// update the card on file, and view past invoices.
router.post('/portal-session', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const stripe = getStripe()
    const attorney = await getAttorneyForUser(req)
    if (!attorney) return res.status(403).json({ error: 'Attorney profile not found' })

    const profile = attorney.attorneyProfile || await ensureAttorneyProfile(attorney.id)
    const customerId = profile.stripeCustomerId
      ? profile.stripeCustomerId
      : await getOrCreateStripeCustomer(attorney, stripe)

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: req.body?.returnUrl || webUrl('/attorney-billing'),
    })

    res.json({ url: session.url })
  } catch (error: any) {
    return stripeError(res, error, 'Failed to create customer portal session')
  }
})

// Attorney-facing ledger of platform charges (routing fees, subscriptions, lead
// credits, featured placement) so an attorney can see what they've paid CaseIQ.
// Reads the platform_payments records the checkout/charge flows already write.
router.get('/platform/history', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const attorney = await getAttorneyForUser(req)
    if (!attorney) return res.status(403).json({ error: 'Attorney profile not found' })

    const records = await db.platformPayment.findMany({
      where: { attorneyId: attorney.id },
      orderBy: { createdAt: 'desc' },
    })

    const TYPE_LABELS: Record<string, string> = {
      routing_fee: 'Case routing fee',
      routing_fee_subscription_credit: 'Included case (subscription)',
      attorney_subscription: 'Subscription',
      subscription: 'Subscription',
      lead_credit: 'Lead credits',
      featured_placement: 'Featured placement',
    }

    // A row counts toward paid totals only when Stripe reports it settled.
    // Skipped (payments disabled) and pending/checkout-created rows are listed
    // for transparency but excluded from the amount paid.
    const isPaid = (status: unknown) =>
      ['succeeded', 'paid', 'complete', 'completed'].includes(String(status || '').toLowerCase())

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    let totalPaidCents = 0
    let paidThisMonthCents = 0
    let paidCount = 0
    const byTypeCents: Record<string, number> = {}

    const payments = records.map((r: any) => {
      const meta = parseJsonMaybe(r.metadata) || {}
      const amountCents = Math.round(Number(r.amount || 0) * 100)
      const paid = isPaid(r.status)
      if (paid) {
        totalPaidCents += amountCents
        paidThisMonthCents += new Date(r.createdAt) >= startOfMonth ? amountCents : 0
        byTypeCents[r.type] = (byTypeCents[r.type] || 0) + amountCents
        paidCount += 1
      }
      return {
        id: r.id,
        type: r.type,
        typeLabel: TYPE_LABELS[r.type] || String(r.type || 'Charge'),
        description: meta.tierLabel || meta.description || null,
        leadId: meta.leadId || null,
        assessmentId: meta.assessmentId || null,
        amount: Number(r.amount || 0),
        currency: (r.currency || 'usd').toUpperCase(),
        status: r.status,
        paid,
        createdAt: new Date(r.createdAt).toISOString(),
      }
    })

    res.json({
      payments,
      summary: {
        currency: 'USD',
        totalPaid: totalPaidCents / 100,
        paidThisMonth: paidThisMonthCents / 100,
        paidCount,
        byType: Object.fromEntries(
          Object.entries(byTypeCents).map(([type, cents]) => [
            type,
            { label: TYPE_LABELS[type] || type, amount: cents / 100 },
          ])
        ),
      },
    })
  } catch (error: any) {
    return stripeError(res, error, 'Failed to load payment history')
  }
})

// Featured-placement / visibility boost purchase via Stripe Checkout.
router.post('/platform/featured-checkout-session', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const stripe = getStripe()
    const attorney = await getAttorneyForUser(req)
    if (!attorney) return res.status(403).json({ error: 'Attorney profile not found' })

    const boostLevel = Number(req.body?.boostLevel)
    const duration = Number(req.body?.duration || 30)
    const boost = FEATURED_BOOST_PRICES[boostLevel]
    if (!boost) return res.status(400).json({ error: 'Invalid boost level' })

    const customerId = await getOrCreateStripeCustomer(attorney, stripe)
    const metadata = {
      kind: 'featured_placement',
      attorneyId: attorney.id,
      boostLevel: toStripeMetadataValue(boostLevel),
      duration: toStripeMetadataValue(duration),
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      success_url: req.body?.successUrl || webUrl('/payment/success?type=featured&session_id={CHECKOUT_SESSION_ID}'),
      cancel_url: req.body?.cancelUrl || webUrl('/payment/cancel?type=featured'),
      metadata,
      payment_intent_data: { metadata },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: toCents(boost.price),
            product_data: {
              name: `CaseIQ ${boost.name}`,
              description: `${duration}-day featured placement (level ${boostLevel})`,
            },
          },
        },
      ],
    })

    await db.platformPayment.create({
      data: {
        attorneyId: attorney.id,
        type: 'featured_placement',
        amount: boost.price,
        status: 'checkout_created',
        stripeCustomerId: customerId,
        stripeCheckoutSessionId: session.id,
        metadata: JSON.stringify(metadata),
      },
    })

    res.json({ checkoutUrl: session.url, sessionId: session.id })
  } catch (error: any) {
    return stripeError(res, error, 'Failed to create featured placement checkout session')
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
  const type = kind === 'attorney_subscription'
    ? 'subscription'
    : kind === 'routing_fee'
      ? 'routing_fee'
      : 'lead_credit'

  const existing = await db.platformPayment.findFirst({ where: { stripeCheckoutSessionId: session.id } })
  const data = {
    attorneyId,
    type,
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
    const includedCases = session.metadata?.includedCasesPerMonth
      ? Number(session.metadata.includedCasesPerMonth)
      : null
    await db.attorneyProfile.update({
      where: { attorneyId },
      data: {
        stripeCustomerId: customerId || undefined,
        stripeSubscriptionId: subscriptionId,
        stripeSubscriptionStatus: 'active',
        stripeSubscriptionPriceId: session.metadata?.stripePriceId || undefined,
        subscriptionActive: true,
        subscriptionTier: session.metadata?.tierId || undefined,
        subscriptionRemainingCases: Number.isFinite(includedCases) ? includedCases : null,
        paymentModel: 'subscription',
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

async function applyFeaturedPlacementFromSession(session: any) {
  const attorneyId = session.metadata?.attorneyId
  if (!attorneyId || session.payment_status !== 'paid') return

  const boostLevel = Number(session.metadata?.boostLevel) || 0
  const duration = Number(session.metadata?.duration) || 30
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
  const amount = fromCents(session.amount_total)

  const featuredUntil = new Date()
  featuredUntil.setDate(featuredUntil.getDate() + duration)

  await db.attorneyProfile.update({
    where: { attorneyId },
    data: { isFeatured: true, boostLevel, featuredUntil },
  })

  await db.attorneyDashboard.upsert({
    where: { attorneyId },
    update: { totalPlatformSpend: { increment: amount || 0 } },
    create: { attorneyId, totalPlatformSpend: amount || 0 },
  })

  const existing = await db.platformPayment.findFirst({ where: { stripeCheckoutSessionId: session.id } })
  const data = {
    attorneyId,
    type: 'featured_placement',
    amount,
    status: 'paid',
    stripeCustomerId: customerId || null,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId || null,
    metadata: JSON.stringify(session.metadata || {}),
  }
  if (existing) {
    await db.platformPayment.update({ where: { id: existing.id }, data })
  } else {
    await db.platformPayment.create({ data })
  }
}

// A subscription invoice failed — mark the attorney's subscription past due and
// stop consuming included-case credit until payment recovers.
async function handleInvoicePaymentFailed(invoice: any) {
  const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  const where = subscriptionId
    ? { stripeSubscriptionId: subscriptionId }
    : customerId
      ? { stripeCustomerId: customerId }
      : null
  if (!where) return

  await db.attorneyProfile.updateMany({
    where,
    data: {
      stripeSubscriptionStatus: 'past_due',
      subscriptionActive: false,
      subscriptionRemainingCases: 0,
    },
  })
}

// A charge was refunded — flag the matching platform/billing payment records.
async function handleChargeRefunded(charge: any) {
  const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
  const fullyRefunded = charge.amount_refunded >= charge.amount
  const status = fullyRefunded ? 'refunded' : 'partially_refunded'

  if (paymentIntentId) {
    await db.platformPayment.updateMany({ where: { stripePaymentIntentId: paymentIntentId }, data: { status } })
    await db.billingPayment.updateMany({
      where: { stripePaymentIntentId: paymentIntentId },
      data: { notes: `Refunded via Stripe (${status})` },
    })
  }
}

// Stripe Connect account state changed — keep charges/payouts flags in sync.
async function handleConnectAccountUpdated(account: any) {
  await db.attorneyProfile.updateMany({
    where: { stripeConnectAccountId: account.id },
    data: {
      stripeConnectChargesEnabled: Boolean(account.charges_enabled),
      stripeConnectPayoutsEnabled: Boolean(account.payouts_enabled),
    },
  })
}

async function saveDefaultPaymentMethodFromSetupSession(stripe: any, session: any) {
  const attorneyId = session.metadata?.attorneyId
  const setupIntentId = typeof session.setup_intent === 'string' ? session.setup_intent : session.setup_intent?.id
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
  if (!attorneyId || !setupIntentId || !customerId) return

  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)
  const paymentMethodId = typeof setupIntent.payment_method === 'string'
    ? setupIntent.payment_method
    : setupIntent.payment_method?.id
  if (!paymentMethodId) return

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  })
  await db.attorneyProfile.update({
    where: { attorneyId },
    data: { stripeCustomerId: customerId },
  })
}

// A card entered via the embedded Payment Element (SetupIntent) succeeded —
// promote it to the customer's default payment method.
async function saveDefaultPaymentMethodFromSetupIntent(stripe: any, setupIntent: any) {
  const attorneyId = setupIntent.metadata?.attorneyId
  const customerId = typeof setupIntent.customer === 'string' ? setupIntent.customer : setupIntent.customer?.id
  const paymentMethodId = typeof setupIntent.payment_method === 'string'
    ? setupIntent.payment_method
    : setupIntent.payment_method?.id
  if (!attorneyId || !customerId || !paymentMethodId) return

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  })
  await db.attorneyProfile.update({
    where: { attorneyId },
    data: { stripeCustomerId: customerId },
  })
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
  const tierId = subscription.metadata?.tierId

  await db.attorneyProfile.updateMany({
    where,
    data: {
      stripeCustomerId: customerId || undefined,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
      stripeSubscriptionPriceId: priceId || undefined,
      stripeCurrentPeriodEnd: currentPeriodEnd,
      subscriptionActive: active,
      subscriptionTier: tierId || undefined,
      paymentModel: active ? 'subscription' : undefined,
      ...(active ? {} : { subscriptionRemainingCases: 0 }),
    },
  })
}

async function resetSubscriptionAllotmentFromInvoice(stripe: any, invoice: any) {
  const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
  if (!subscriptionId || invoice.status !== 'paid') return

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const attorneyId = subscription.metadata?.attorneyId
  const includedCases = subscription.metadata?.includedCasesPerMonth
    ? Number(subscription.metadata.includedCasesPerMonth)
    : null
  if (!attorneyId || !Number.isFinite(includedCases)) return

  await db.attorneyProfile.update({
    where: { attorneyId },
    data: {
      subscriptionActive: ['active', 'trialing'].includes(subscription.status),
      subscriptionTier: subscription.metadata?.tierId || undefined,
      subscriptionRemainingCases: includedCases,
      stripeSubscriptionStatus: subscription.status,
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

  // Idempotency: record the event id first; if it already exists, we've handled
  // this delivery before and can safely acknowledge without reprocessing.
  try {
    await db.stripeWebhookEvent.create({ data: { id: event.id, type: event.type } })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      logger.info('Duplicate Stripe webhook event ignored', { id: event.id, type: event.type })
      return res.json({ received: true, duplicate: true })
    }
    logger.warn('Failed to persist Stripe webhook event id', { id: event.id, error: error?.message })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any
        const kind = session.metadata?.kind
        if (kind === 'case_invoice') {
          await recordCaseInvoicePayment(session)
        } else if (kind === 'attorney_payment_method') {
          await saveDefaultPaymentMethodFromSetupSession(stripe, session)
        } else if (kind === 'featured_placement') {
          await applyFeaturedPlacementFromSession(session)
        } else if (kind === 'attorney_subscription' || kind === 'lead_credit' || kind === 'routing_fee') {
          await recordPlatformCheckout(session)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object as any)
        break
      case 'invoice.paid':
        await resetSubscriptionAllotmentFromInvoice(stripe, event.data.object as any)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as any)
        break
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as any)
        break
      case 'account.updated':
        await handleConnectAccountUpdated(event.data.object as any)
        break
      case 'setup_intent.succeeded': {
        const setupIntent = event.data.object as any
        if (setupIntent.metadata?.kind === 'attorney_payment_method') {
          await saveDefaultPaymentMethodFromSetupIntent(stripe, setupIntent)
        }
        break
      }
      default:
        break
    }

    res.json({ received: true })
  } catch (error: any) {
    // Roll back the idempotency marker so Stripe's retry can reprocess the event.
    await db.stripeWebhookEvent.delete({ where: { id: event.id } }).catch(() => {})
    logger.error('Failed to process Stripe webhook', { type: event.type, error: error.message })
    res.status(500).json({ error: 'Failed to process Stripe webhook' })
  }
})

export default router
