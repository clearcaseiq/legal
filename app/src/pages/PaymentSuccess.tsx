import { Link, useSearchParams } from 'react-router-dom'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-emerald-950 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Payment received</p>
        <h1 className="mt-2 text-3xl font-bold">Thanks, your payment is being processed.</h1>
        <p className="mt-3 text-sm text-emerald-800">
          Stripe will notify CaseIQ when the payment is finalized. Your invoice status will update automatically.
        </p>
        {sessionId && <p className="mt-4 text-xs text-emerald-700">Stripe session: {sessionId}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/dashboard" className="btn-primary">
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
