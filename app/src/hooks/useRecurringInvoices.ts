import { useCallback, useEffect, useState } from 'react'
import { createRecurringInvoice, getRecurringInvoices, processRecurringInvoices } from '../lib/api'

const DEFAULT_RECURRING_INVOICE_FORM = {
  amount: '',
  intervalDays: '30',
  nextRunAt: '',
  notes: '',
}

/**
 * Recurring invoices for one case.
 *
 * Deliberately separate from useAttorneyCaseHealth, which also owns recurring
 * invoices but loads case health, health rules and negotiation cadence
 * templates alongside them. The billing surface needs none of that, and
 * reusing that hook would cost four unrelated requests per mount.
 */
export function useRecurringInvoices(selectedLeadId?: string) {
  const [recurringInvoices, setRecurringInvoices] = useState<any[]>([])
  const [recurringInvoiceForm, setRecurringInvoiceForm] = useState(DEFAULT_RECURRING_INVOICE_FORM)

  const handleAddRecurringInvoice = useCallback(async () => {
    if (!selectedLeadId || !recurringInvoiceForm.amount) return
    try {
      const record = await createRecurringInvoice(selectedLeadId, {
        amount: recurringInvoiceForm.amount,
        intervalDays: recurringInvoiceForm.intervalDays,
        nextRunAt: recurringInvoiceForm.nextRunAt || undefined,
        notes: recurringInvoiceForm.notes,
      })
      setRecurringInvoices((prev) => [record, ...prev])
      setRecurringInvoiceForm(DEFAULT_RECURRING_INVOICE_FORM)
    } catch (err) {
      console.error('Failed to create recurring invoice:', err)
    }
  }, [recurringInvoiceForm, selectedLeadId])

  const handleProcessRecurringInvoices = useCallback(async () => {
    if (!selectedLeadId) return
    try {
      const data = await processRecurringInvoices(selectedLeadId)
      if (data?.created) {
        const records = await getRecurringInvoices(selectedLeadId)
        setRecurringInvoices(Array.isArray(records) ? records : [])
      }
    } catch (err) {
      console.error('Failed to process recurring invoices:', err)
    }
  }, [selectedLeadId])

  useEffect(() => {
    if (!selectedLeadId) {
      setRecurringInvoices([])
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const data = await getRecurringInvoices(selectedLeadId)
        if (!cancelled) setRecurringInvoices(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Failed to load recurring invoices:', err)
        if (!cancelled) setRecurringInvoices([])
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [selectedLeadId])

  return {
    handleAddRecurringInvoice,
    handleProcessRecurringInvoices,
    recurringInvoiceForm,
    recurringInvoices,
    setRecurringInvoiceForm,
  }
}
