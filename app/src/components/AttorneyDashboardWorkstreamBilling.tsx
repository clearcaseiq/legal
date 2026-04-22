type AttorneyDashboardWorkstreamBillingProps = {
  invoiceForm: any
  setInvoiceForm: any
  handleAddInvoice: any
  invoiceItems: any[]
  handleDownloadInvoicePdf: any
  handleDownloadInvoiceDocx: any
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
  invoiceForm,
  setInvoiceForm,
  handleAddInvoice,
  invoiceItems,
  handleDownloadInvoicePdf,
  handleDownloadInvoiceDocx,
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
  return (
    <>
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
