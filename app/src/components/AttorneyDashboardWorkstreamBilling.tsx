import { useEffect, useState } from 'react'
import {
  createAttorneyPaymentMethodSetupSession,
  createLeadCreditCheckoutSession,
  createPlatformSubscriptionCheckoutSession,
  createStripeConnectAccountLink,
  getStripeConnectStatus,
} from '../lib/api'

const SUBSCRIPTION_PLANS = [
  {
    id: 'starter',
    label: 'Starter',
    price: '$299/mo',
    includedCases: '1 accepted case/mo',
    description: 'Best for solo attorneys testing CaseIQ routing.',
  },
  {
    id: 'growth',
    label: 'Growth',
    price: '$999/mo',
    includedCases: '5 accepted cases/mo',
    description: 'Best for active PI practices with steady intake needs.',
  },
  {
    id: 'pro',
    label: 'Pro',
    price: '$2,499/mo',
    includedCases: '15 accepted cases/mo',
    description: 'Best for firms scaling intake across multiple attorneys.',
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    price: 'Custom',
    includedCases: 'Custom case allotment',
    description: 'Best for high-volume regional firms.',
  },
]

type AttorneyDashboardWorkstreamBillingProps = {
  profile?: any
  invoiceForm: any
  setInvoiceForm: any
  handleAddInvoice: any
  invoiceItems: any[]
  handleDownloadInvoicePdf: any
  handleDownloadInvoiceDocx: any
  handlePayInvoiceWithStripe: any
  paymentForm: any
  setPaymentForm: any
  handleAddPayment: any
  paymentItems: any[]
  handleDownloadPaymentReceipt: any
  recurringInvoiceForm: any
  setRecurringInvoiceForm: any
  handleProcessRecurringInvoices: any
  handleAddRecurringInvoice: any
  recurringInvoices: any[]
}

export default function AttorneyDashboardWorkstreamBilling({
  profile,
  invoiceForm,
  setInvoiceForm,
  handleAddInvoice,
  invoiceItems,
  handleDownloadInvoicePdf,
  handleDownloadInvoiceDocx,
  handlePayInvoiceWithStripe,
  paymentForm,
  setPaymentForm,
  handleAddPayment,
  paymentItems,
  handleDownloadPaymentReceipt,
  recurringInvoiceForm,
  setRecurringInvoiceForm,
  handleProcessRecurringInvoices,
  handleAddRecurringInvoice,
  recurringInvoices,
}: AttorneyDashboardWorkstreamBillingProps) {
  const [connectStatus, setConnectStatus] = useState<any>(null)
  const [stripeActionLoading, setStripeActionLoading] = useState<string | null>(null)
  const activeSubscriptionPlan = SUBSCRIPTION_PLANS.find(plan => plan.id === profile?.subscriptionTier)

  useEffect(() => {
    getStripeConnectStatus()
      .then(setConnectStatus)
      .catch(() => setConnectStatus(null))
  }, [])

  const redirectToStripe = async (action: string, fn: () => Promise<{ checkoutUrl?: string; url?: string }>) => {
    try {
      setStripeActionLoading(action)
      const result = await fn()
      const url = result.checkoutUrl || result.url
      if (!url) throw new Error('Stripe did not return a redirect URL')
      window.location.assign(url)
    } catch (error) {
      console.error(`Failed to start Stripe ${action}:`, error)
      window.alert('Stripe is not configured yet. Add Stripe environment keys and try again.')
    } finally {
      setStripeActionLoading(null)
    }
  }

  return (
    <>
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
        <h4 className="text-sm font-semibold text-emerald-950 mb-2">Stripe Platform Billing</h4>
        <p className="text-xs text-emerald-800">
          Use Stripe Checkout for CaseIQ subscriptions, saved payment methods, lead credits, and Connect onboarding for payouts.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => redirectToStripe('payment method setup', () => createAttorneyPaymentMethodSetupSession())}
            disabled={stripeActionLoading !== null}
            className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800 disabled:opacity-60"
          >
            Add Payment Method
          </button>
          <button
            type="button"
            onClick={() => redirectToStripe('subscription', () => createPlatformSubscriptionCheckoutSession())}
            disabled={stripeActionLoading !== null}
            className="px-3 py-1.5 text-sm font-medium text-emerald-800 bg-white border border-emerald-300 rounded-md hover:bg-emerald-100 disabled:opacity-60"
          >
            Start Subscription
          </button>
          <button
            type="button"
            onClick={() => redirectToStripe('lead credits', () => createLeadCreditCheckoutSession({ amount: 500 }))}
            disabled={stripeActionLoading !== null}
            className="px-3 py-1.5 text-sm font-medium text-emerald-800 bg-white border border-emerald-300 rounded-md hover:bg-emerald-100 disabled:opacity-60"
          >
            Buy $500 Lead Credits
          </button>
          <button
            type="button"
            onClick={() => redirectToStripe('Connect onboarding', () => createStripeConnectAccountLink())}
            disabled={stripeActionLoading !== null}
            className="px-3 py-1.5 text-sm font-medium text-emerald-800 bg-white border border-emerald-300 rounded-md hover:bg-emerald-100 disabled:opacity-60"
          >
            {connectStatus?.connected ? 'Update Payout Setup' : 'Set Up Payouts'}
          </button>
        </div>
        {connectStatus?.connected && (
          <p className="mt-2 text-xs text-emerald-800">
            Connect status: charges {connectStatus.chargesEnabled ? 'enabled' : 'pending'}, payouts{' '}
            {connectStatus.payoutsEnabled ? 'enabled' : 'pending'}.
          </p>
        )}
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Subscription Model</h4>
            <p className="mt-1 text-xs text-gray-600">
              Subscriptions include accepted cases each month. After the included cases are used, the normal per-case routing fee applies.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {profile?.subscriptionActive
              ? `${activeSubscriptionPlan?.label || profile?.subscriptionTier || 'Active'} plan`
              : 'No active subscription'}
          </div>
        </div>
        {profile?.subscriptionActive && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            Included cases remaining this period:{' '}
            <span className="font-semibold">
              {profile.subscriptionRemainingCases == null ? 'Custom' : profile.subscriptionRemainingCases}
            </span>
          </div>
        )}
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isEnterprise = plan.id === 'enterprise'
            const isCurrent = profile?.subscriptionTier === plan.id && profile?.subscriptionActive
            return (
              <div
                key={plan.id}
                className={`rounded-xl border p-4 ${isCurrent ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-sm font-semibold text-slate-900">{plan.label}</h5>
                  {isCurrent && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Current</span>}
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-950">{plan.price}</div>
                <p className="mt-1 text-xs font-medium text-brand-700">{plan.includedCases}</p>
                <p className="mt-2 min-h-10 text-xs text-slate-600">{plan.description}</p>
                <button
                  type="button"
                  onClick={() => {
                    if (isEnterprise) {
                      window.alert('Enterprise subscriptions require custom billing setup.')
                      return
                    }
                    redirectToStripe('subscription', () => createPlatformSubscriptionCheckoutSession({ tierId: plan.id }))
                  }}
                  disabled={stripeActionLoading !== null || isCurrent}
                  className="mt-4 w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {isCurrent ? 'Current Plan' : isEnterprise ? 'Contact Sales' : `Start ${plan.label}`}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-md border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Billing & Payments</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <input
            value={invoiceForm.invoiceNumber}
            onChange={(e) => setInvoiceForm((prev: any) => ({ ...prev, invoiceNumber: e.target.value }))}
            className="input"
            placeholder="Invoice #"
          />
          <input
            value={invoiceForm.amount}
            onChange={(e) => setInvoiceForm((prev: any) => ({ ...prev, amount: e.target.value }))}
            className="input"
            placeholder="Invoice amount"
          />
          <select
            value={invoiceForm.status}
            onChange={(e) => setInvoiceForm((prev: any) => ({ ...prev, status: e.target.value }))}
            className="input"
          >
            <option value="open">Open</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <input
            type="date"
            value={invoiceForm.dueDate}
            onChange={(e) => setInvoiceForm((prev: any) => ({ ...prev, dueDate: e.target.value }))}
            className="input"
          />
          <input
            value={invoiceForm.notes}
            onChange={(e) => setInvoiceForm((prev: any) => ({ ...prev, notes: e.target.value }))}
            className="input md:col-span-2"
            placeholder="Invoice notes"
          />
        </div>
        <div className="mt-3">
          <button
            onClick={handleAddInvoice}
            className="px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
          >
            Add Invoice
          </button>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          {invoiceItems.length === 0 ? (
            <div className="text-gray-500">No invoices yet.</div>
          ) : (
            invoiceItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between border border-gray-100 rounded-md px-2 py-1">
                <div>
                  <div className="font-medium">{item.invoiceNumber || 'Invoice'}</div>
                  <div className="text-gray-600 text-xs">
                    ${item.amount} • {item.status} • {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No due date'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.status !== 'paid' && (
                    <button
                      onClick={() => handlePayInvoiceWithStripe(item.id)}
                      className="text-xs text-emerald-600 hover:text-emerald-800"
                    >
                      Pay with Stripe
                    </button>
                  )}
                  <button
                    onClick={() => handleDownloadInvoicePdf(item.id)}
                    className="text-xs text-brand-600 hover:text-brand-800"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => handleDownloadInvoiceDocx(item.id)}
                    className="text-xs text-brand-600 hover:text-brand-800"
                  >
                    Word
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <input
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm((prev: any) => ({ ...prev, amount: e.target.value }))}
            className="input"
            placeholder="Payment amount"
          />
          <input
            value={paymentForm.method}
            onChange={(e) => setPaymentForm((prev: any) => ({ ...prev, method: e.target.value }))}
            className="input"
            placeholder="Method (ACH/check)"
          />
          <input
            type="date"
            value={paymentForm.receivedAt}
            onChange={(e) => setPaymentForm((prev: any) => ({ ...prev, receivedAt: e.target.value }))}
            className="input"
          />
          <input
            value={paymentForm.reference}
            onChange={(e) => setPaymentForm((prev: any) => ({ ...prev, reference: e.target.value }))}
            className="input"
            placeholder="Reference"
          />
          <input
            value={paymentForm.notes}
            onChange={(e) => setPaymentForm((prev: any) => ({ ...prev, notes: e.target.value }))}
            className="input md:col-span-2"
            placeholder="Payment notes"
          />
        </div>
        <div className="mt-3">
          <button
            onClick={handleAddPayment}
            className="px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
          >
            Add Payment
          </button>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          {paymentItems.length === 0 ? (
            <div className="text-gray-500">No payments yet.</div>
          ) : (
            paymentItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between border border-gray-100 rounded-md px-2 py-1">
                <div>
                  <div className="font-medium">${item.amount}</div>
                  <div className="text-gray-600 text-xs">
                    {item.method || 'Method not set'} • {item.receivedAt ? new Date(item.receivedAt).toLocaleDateString() : 'No date'}
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadPaymentReceipt(item.id)}
                  className="text-xs text-brand-600 hover:text-brand-800"
                >
                  Receipt
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-md border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900">Recurring Invoices</h4>
          <button
            onClick={handleProcessRecurringInvoices}
            className="text-xs text-brand-600 hover:text-brand-800"
          >
            Run Due
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <input
            value={recurringInvoiceForm.amount}
            onChange={(e) => setRecurringInvoiceForm((prev: any) => ({ ...prev, amount: e.target.value }))}
            className="input"
            placeholder="Amount"
          />
          <input
            value={recurringInvoiceForm.intervalDays}
            onChange={(e) => setRecurringInvoiceForm((prev: any) => ({ ...prev, intervalDays: e.target.value }))}
            className="input"
            placeholder="Interval days"
          />
          <input
            type="date"
            value={recurringInvoiceForm.nextRunAt}
            onChange={(e) => setRecurringInvoiceForm((prev: any) => ({ ...prev, nextRunAt: e.target.value }))}
            className="input"
          />
          <input
            value={recurringInvoiceForm.notes}
            onChange={(e) => setRecurringInvoiceForm((prev: any) => ({ ...prev, notes: e.target.value }))}
            className="input md:col-span-4"
            placeholder="Notes"
          />
        </div>
        <div className="mt-3">
          <button
            onClick={handleAddRecurringInvoice}
            className="px-3 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
          >
            Add Recurring Invoice
          </button>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          {recurringInvoices.length === 0 ? (
            <div className="text-gray-500">No recurring invoices yet.</div>
          ) : (
            recurringInvoices.map((item) => (
              <div key={item.id} className="border border-gray-100 rounded-md px-2 py-1">
                <div className="font-medium">${item.amount}</div>
                <div className="text-gray-600 text-xs">
                  Every {item.intervalDays} days • Next {item.nextRunAt ? new Date(item.nextRunAt).toLocaleDateString() : 'N/A'} • {item.status}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
