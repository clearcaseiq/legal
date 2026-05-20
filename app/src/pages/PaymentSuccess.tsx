import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { decideLead } from '../lib/api'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const type = searchParams.get('type')
  const leadId = searchParams.get('leadId')
  const [acceptanceStatus, setAcceptanceStatus] = useState<'idle' | 'accepting' | 'accepted' | 'failed'>('idle')

  useEffect(() => {
    if (type !== 'routing_fee' || !leadId) return

    let cancelled = false
    const acceptanceKey = `caseiq:routing-fee-accepted:${leadId}:${sessionId || 'latest'}`
    if (window.sessionStorage.getItem(acceptanceKey)) {
      setAcceptanceStatus('accepted')
      return
    }

    setAcceptanceStatus('accepting')
    decideLead(leadId, 'accept')
      .then(() => {
        window.sessionStorage.setItem(acceptanceKey, 'true')
        if (!cancelled) setAcceptanceStatus('accepted')
      })
      .catch((error) => {
        console.error('Failed to accept lead after routing fee payment:', error)
        if (!cancelled) setAcceptanceStatus('failed')
      })

    return () => {
      cancelled = true
    }
  }, [leadId, sessionId, type])

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-emerald-950 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Payment received</p>
        <h1 className="mt-2 text-3xl font-bold">Thanks, your payment is being processed.</h1>
        <p className="mt-3 text-sm text-emerald-800">
          Stripe will notify CaseIQ when the payment is finalized. Your payment status will update automatically.
        </p>
        {type === 'routing_fee' && (
          <p className="mt-3 text-sm text-emerald-800">
            {acceptanceStatus === 'accepting' && 'Finalizing the case acceptance...'}
            {acceptanceStatus === 'accepted' && 'The case has been accepted and moved into your attorney dashboard.'}
            {acceptanceStatus === 'failed' && 'Payment succeeded, but the case acceptance could not be finalized automatically. Please return to the attorney dashboard and try again.'}
          </p>
        )}
        {type === 'payment_method' && (
          <p className="mt-3 text-sm text-emerald-800">
            Your payment method has been saved for automatic routing-fee charges.
          </p>
        )}
        {sessionId && <p className="mt-4 text-xs text-emerald-700">Stripe session: {sessionId}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={type === 'routing_fee' ? '/attorney-dashboard' : '/dashboard'} className="btn-primary">
            Go to Dashboard
          </Link>
          <Link to="/" className="btn-outline">
            Back Home
          </Link>
        </div>
      </div>
    </div>
  )
}
