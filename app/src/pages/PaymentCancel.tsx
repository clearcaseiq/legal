import { Link, useSearchParams } from 'react-router-dom'

export default function PaymentCancel() {
  const [searchParams] = useSearchParams()
  const invoiceId = searchParams.get('invoiceId')

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-950 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Payment cancelled</p>
        <h1 className="mt-2 text-3xl font-bold">No payment was completed.</h1>
        <p className="mt-3 text-sm text-amber-800">
          You can return to billing and start a new Stripe Checkout session when you are ready.
        </p>
        {invoiceId && <p className="mt-4 text-xs text-amber-700">Invoice: {invoiceId}</p>}
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
