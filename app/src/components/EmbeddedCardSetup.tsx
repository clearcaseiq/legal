import { useEffect, useRef, useState } from 'react'
import { getStripeConfig, createStripeSetupIntent } from '../lib/api'
import { getStripeJs } from '../lib/stripeJs'

type Props = {
  onSuccess?: () => void
  onCancel?: () => void
}

// In-app card entry using the Stripe Payment Element (SetupIntent). Saves the
// card to the attorney's Stripe customer without redirecting to hosted Checkout.
// The saved card is promoted to the customer default via the
// setup_intent.succeeded webhook on the API.
export default function EmbeddedCardSetup({ onSuccess, onCancel }: Props) {
  const elementRef = useRef<HTMLDivElement | null>(null)
  const stripeRef = useRef<any>(null)
  const elementsRef = useRef<any>(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [succeeded, setSucceeded] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        setLoading(true)
        setError(null)

        const config = await getStripeConfig()
        if (!config.publishableKey) {
          if (!cancelled) setUnavailable(true)
          return
        }

        const [{ clientSecret }, stripe] = await Promise.all([
          createStripeSetupIntent(),
          getStripeJs(config.publishableKey),
        ])
        if (cancelled) return

        const elements = stripe.elements({ clientSecret, appearance: { theme: 'stripe' } })
        const paymentElement = elements.create('payment')
        stripeRef.current = stripe
        elementsRef.current = elements

        // The ref div is only rendered once loading is false, so mount on the
        // next tick when the node exists.
        requestAnimationFrame(() => {
          if (!cancelled && elementRef.current) {
            paymentElement.mount(elementRef.current)
          }
        })
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.error || err?.message || 'Unable to load the card form.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const stripe = stripeRef.current
    const elements = elementsRef.current
    if (!stripe || !elements) return

    setSubmitting(true)
    setError(null)
    try {
      const { error: confirmError } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/attorney-billing?status=payment_method_saved`,
        },
        redirect: 'if_required',
      })

      if (confirmError) {
        setError(confirmError.message || 'Card could not be saved.')
        setSubmitting(false)
        return
      }

      setSucceeded(true)
      setSubmitting(false)
      onSuccess?.()
    } catch (err: any) {
      setError(err?.message || 'Card could not be saved.')
      setSubmitting(false)
    }
  }

  if (unavailable) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        In-app card entry is not configured. Use the hosted checkout button instead.
      </div>
    )
  }

  if (succeeded) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        Card saved. Stripe will use this card for future CaseIQ charges.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-4">
      {loading && <p className="text-sm text-gray-500">Loading secure card form...</p>}
      <div ref={elementRef} className={loading ? 'hidden' : ''} />

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {submitting ? 'Saving...' : 'Save Card'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </form>
  )
}
