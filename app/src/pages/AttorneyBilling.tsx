import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  createAttorneyPaymentMethodSetupSession,
  createFeaturedPlacementCheckoutSession,
  createLeadCreditCheckoutSession,
  createPlatformSubscriptionCheckoutSession,
  createStripePortalSession,
  getMyAttorneyProfile,
} from '../lib/api'
import EmbeddedCardSetup from '../components/EmbeddedCardSetup'

const featuredTiers = [
  { level: 1, name: 'Basic Boost', price: 99, blurb: 'Priority in search results' },
  { level: 2, name: 'Standard Boost', price: 199, blurb: 'Top placement + profile highlighting' },
  { level: 3, name: 'Premium Boost', price: 399, blurb: 'Exclusive top placement + email marketing' },
  { level: 4, name: 'Elite Boost', price: 699, blurb: 'Elite placement + direct lead routing' },
  { level: 5, name: 'Champion Boost', price: 999, blurb: 'Max visibility + priority support' },
]

const billingCards = [
  {
    title: 'Payment Method',
    description: 'Add or update the credit card used for routing fees, subscriptions, and lead credits.',
  },
  {
    title: 'Subscription',
    description: 'Choose a CaseIQ plan with included accepted cases each month.',
  },
  {
    title: 'Invoices & Receipts',
    description: 'Stripe receipts are emailed automatically after successful payments.',
  },
]

export default function AttorneyBilling() {
  const [searchParams] = useSearchParams()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCardForm, setShowCardForm] = useState(false)
  const status = searchParams.get('status')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getMyAttorneyProfile()
      .then((data) => {
        if (!cancelled) setProfile(data?.profile || data)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.error || 'Unable to load billing profile.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const redirectToStripe = async (action: string, fn: () => Promise<{ checkoutUrl?: string }>) => {
    try {
      setActionLoading(action)
      setError(null)
      const result = await fn()
      if (!result.checkoutUrl) throw new Error('Stripe did not return a checkout URL.')
      window.location.assign(result.checkoutUrl)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Unable to start Stripe billing flow.')
      setActionLoading(null)
    }
  }

  const startPaymentMethodSetup = () => {
    const origin = window.location.origin
    return redirectToStripe('payment-method', () => createAttorneyPaymentMethodSetupSession({
      successUrl: `${origin}/attorney-billing?status=payment_method_saved&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/attorney-billing?status=payment_method_cancelled`,
    }))
  }

  const startSubscription = (tierId = 'starter') => {
    const origin = window.location.origin
    return redirectToStripe('subscription', () => createPlatformSubscriptionCheckoutSession({
      tierId,
      successUrl: `${origin}/attorney-billing?status=subscription_started&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/attorney-billing?status=subscription_cancelled`,
    }))
  }

  const openCustomerPortal = async () => {
    try {
      setActionLoading('portal')
      setError(null)
      const origin = window.location.origin
      const result = await createStripePortalSession({ returnUrl: `${origin}/attorney-billing` })
      if (!result.url) throw new Error('Stripe did not return a portal URL.')
      window.location.assign(result.url)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Unable to open the billing portal.')
      setActionLoading(null)
    }
  }

  const buyLeadCredits = () => {
    const origin = window.location.origin
    return redirectToStripe('lead-credits', () => createLeadCreditCheckoutSession({
      amount: 500,
      successUrl: `${origin}/attorney-billing?status=lead_credits_added&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/attorney-billing?status=lead_credits_cancelled`,
    }))
  }

  const buyFeaturedPlacement = (boostLevel: number) => {
    const origin = window.location.origin
    return redirectToStripe(`featured-${boostLevel}`, () => createFeaturedPlacementCheckoutSession({
      boostLevel,
      duration: 30,
      successUrl: `${origin}/attorney-billing?status=featured_started&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/attorney-billing?status=featured_cancelled`,
    }))
  }

  const statusMessage = status === 'payment_method_saved'
    ? 'Payment method saved. Stripe will use this card for future CaseIQ charges.'
    : status === 'subscription_started'
      ? 'Subscription started. Your CaseIQ plan is now being processed by Stripe.'
      : status === 'lead_credits_added'
        ? 'Lead credits checkout completed.'
        : status === 'featured_started'
          ? 'Featured placement purchased. Your boost activates once Stripe confirms the payment.'
          : status?.includes('cancelled')
            ? 'Stripe checkout was cancelled. No billing changes were made.'
            : null

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Attorney Billing</p>
            <h1 className="mt-1 text-3xl font-bold text-gray-900">Set up Stripe billing</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Manage the credit card used for subscriptions, routing fees, and lead credits.
            </p>
          </div>
          <Link
            to="/attorney-dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back to Dashboard
          </Link>
        </div>

        {statusMessage && (
          <div className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
            status?.includes('cancelled')
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}>
            {statusMessage}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Credit Card Setup</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Securely add or update your card in Stripe. CaseIQ does not store card numbers.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {loading ? 'Loading...' : profile?.stripeCustomerId ? 'Stripe customer ready' : 'No card setup yet'}
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {billingCards.map((card) => (
                <div key={card.title} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-900">{card.title}</p>
                  <p className="mt-2 text-xs text-gray-600">{card.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowCardForm((v) => !v)}
                disabled={actionLoading !== null}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
              >
                {showCardForm ? 'Hide Card Form' : 'Enter Card Here'}
              </button>
              <button
                type="button"
                onClick={startPaymentMethodSetup}
                disabled={actionLoading !== null}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {actionLoading === 'payment-method' ? 'Opening Stripe...' : 'Use Hosted Checkout'}
              </button>
              <button
                type="button"
                onClick={() => startSubscription(profile?.subscriptionTier || 'starter')}
                disabled={actionLoading !== null}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {actionLoading === 'subscription' ? 'Opening Stripe...' : 'Start Subscription'}
              </button>
              <button
                type="button"
                onClick={buyLeadCredits}
                disabled={actionLoading !== null}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {actionLoading === 'lead-credits' ? 'Opening Stripe...' : 'Buy $500 Lead Credits'}
              </button>
              {profile?.stripeCustomerId && (
                <button
                  type="button"
                  onClick={openCustomerPortal}
                  disabled={actionLoading !== null}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  {actionLoading === 'portal' ? 'Opening Stripe...' : 'Manage Subscription & Cards'}
                </button>
              )}
            </div>

            {showCardForm && (
              <div className="mt-5">
                <EmbeddedCardSetup
                  onSuccess={() => {
                    setShowCardForm(false)
                    getMyAttorneyProfile()
                      .then((data) => setProfile(data?.profile || data))
                      .catch(() => {})
                  }}
                  onCancel={() => setShowCardForm(false)}
                />
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Billing Status</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Current plan</dt>
                <dd className="mt-1 font-semibold text-gray-900">
                  {profile?.subscriptionActive ? profile?.subscriptionTier || 'Active' : 'No active subscription'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Included cases remaining</dt>
                <dd className="mt-1 font-semibold text-gray-900">
                  {profile?.subscriptionRemainingCases == null ? 'None' : profile.subscriptionRemainingCases}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Stripe customer</dt>
                <dd className="mt-1 break-all font-semibold text-gray-900">
                  {profile?.stripeCustomerId || 'Created when you add a card'}
                </dd>
              </div>
            </dl>
            <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
              After a card is saved, future routing fees can use Stripe off-session payment instead of asking for a new checkout each time.
            </p>
          </aside>
        </div>

        <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Featured Placement</h2>
              <p className="mt-2 max-w-2xl text-sm text-gray-600">
                Boost your visibility in search results and the attorney directory for 30 days. Purchases are processed through Stripe.
              </p>
            </div>
            {profile?.isFeatured ? (
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                Active boost{profile?.boostLevel ? ` · Level ${profile.boostLevel}` : ''}
              </span>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredTiers.map((tier) => (
              <div key={tier.level} className="flex flex-col justify-between rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-semibold text-gray-900">{tier.name}</p>
                    <p className="text-sm font-bold text-gray-900">${tier.price}</p>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">{tier.blurb}</p>
                </div>
                <button
                  type="button"
                  onClick={() => buyFeaturedPlacement(tier.level)}
                  disabled={actionLoading !== null}
                  className="mt-4 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
                >
                  {actionLoading === `featured-${tier.level}` ? 'Opening Stripe...' : '30-day Boost'}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
