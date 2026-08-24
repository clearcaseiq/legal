import CaseInvoicingSections from '../../components/CaseInvoicingSections'
import { useAttorneyCaseActivity } from '../../hooks/useAttorneyCaseActivity'
import { useRecurringInvoices } from '../../hooks/useRecurringInvoices'

/**
 * Client billing for one case: invoices, payments, and recurring invoices.
 *
 * This work was already built against live endpoints but was only reachable
 * from the legacy dashboard workstream, whose deep-links resolve to this
 * workspace and fell through to Overview. Account-level Stripe billing
 * (subscription, lead credits, payouts) stays on /attorney-billing.
 */
export default function CaseBillingPanel({ leadId }: { leadId: string }) {
  const activity = useAttorneyCaseActivity(leadId)
  const recurring = useRecurringInvoices(leadId)

  return (
    <div className="space-y-4">
      <CaseInvoicingSections
        invoiceForm={activity.invoiceForm}
        setInvoiceForm={activity.setInvoiceForm}
        handleAddInvoice={activity.handleAddInvoice}
        invoiceItems={activity.invoiceItems}
        handleDownloadInvoicePdf={activity.handleDownloadInvoicePdf}
        handleDownloadInvoiceDocx={activity.handleDownloadInvoiceDocx}
        handlePayInvoiceWithStripe={activity.handlePayInvoiceWithStripe}
        paymentForm={activity.paymentForm}
        setPaymentForm={activity.setPaymentForm}
        handleAddPayment={activity.handleAddPayment}
        paymentItems={activity.paymentItems}
        handleDownloadPaymentReceipt={activity.handleDownloadPaymentReceipt}
        recurringInvoiceForm={recurring.recurringInvoiceForm}
        setRecurringInvoiceForm={recurring.setRecurringInvoiceForm}
        handleProcessRecurringInvoices={recurring.handleProcessRecurringInvoices}
        handleAddRecurringInvoice={recurring.handleAddRecurringInvoice}
        recurringInvoices={recurring.recurringInvoices}
      />
    </div>
  )
}
