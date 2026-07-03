import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, CreditCard, ShieldCheck } from 'lucide-react'
import EmbeddedCardSetup from '../components/EmbeddedCardSetup'
import BrandLogo from '../components/BrandLogo'
import { useLanguage } from '../contexts/LanguageContext'
import { getPaymentMethodStatus, syncDefaultPaymentMethod } from '../lib/api'

// Post-registration onboarding gate: attorneys save a card before reaching the
// dashboard. With a card on file, accepting a case charges the routing fee
// instantly (off-session) instead of bouncing the attorney to hosted Checkout.
export default function AttorneyOnboardingPayment() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next') || '/attorney-dashboard'

  const [loading, setLoading] = useState(true)
  const [stripeEnabled, setStripeEnabled] = useState(true)
  const [savedCard, setSavedCard] = useState<{ brand?: string | null; last4?: string | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadStatus() {
      try {
        const status = await getPaymentMethodStatus()
        if (cancelled) return
        setStripeEnabled(status.stripeEnabled)
        if (status.hasDefaultPaymentMethod) {
          setSavedCard({ brand: status.brand, last4: status.last4 })
        }
      } catch {
        // If status can't be read, still show the form; saving is the source of truth.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadStatus()
    return () => {
      cancelled = true
    }
  }, [])

  const handleCardSaved = useCallback(async () => {
    try {
      // Promote the just-entered card to the customer default immediately so
      // off-session charges work without depending on the Stripe webhook.
      const result = await syncDefaultPaymentMethod()
      setSavedCard({ brand: result.brand, last4: result.last4 })
    } catch {
      // The card was saved on Stripe even if promotion lagged; unblock the flow.
      setSavedCard({})
    }
  }, [])

  const goNext = useCallback(() => {
    navigate(next)
  }, [navigate, next])

  const cardLabel = savedCard?.brand && savedCard?.last4
    ? `${savedCard.brand.toUpperCase()} •••• ${savedCard.last4}`
    : 'Card on file'

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <Link
            to="/"
            aria-label={t('common.appName')}
            className="inline-flex justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <BrandLogo appName={t('common.appName')} size="lg" />
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-brand-50 p-2 text-brand-700">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Add a payment method</h1>
              <p className="mt-1 text-sm text-gray-600">
                Save a card to finish setting up your account. You&apos;re not charged now — a
                per-case routing fee applies only when you accept a case, and having a card on file
                lets you accept instantly without an extra checkout step.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Card details are stored securely by Stripe. We never see your full card number.
          </div>

          <div className="mt-6">
            {loading ? (
              <p className="text-sm text-gray-500">Loading secure card form...</p>
            ) : !stripeEnabled ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Card entry isn&apos;t configured in this environment. You can continue and add a
                payment method later from Billing.
              </div>
            ) : savedCard ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                  <CheckCircle className="h-5 w-5" />
                  {cardLabel} saved
                </div>
                <p className="mt-1 text-sm text-emerald-800">
                  You&apos;re all set. This card will be used for routing fees when you accept a case.
                </p>
              </div>
            ) : (
              <EmbeddedCardSetup onSuccess={handleCardSaved} />
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            {stripeEnabled && !savedCard ? (
              <p className="text-xs text-gray-500">A saved card is required to accept cases.</p>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={goNext}
              disabled={stripeEnabled && !savedCard}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue to dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
