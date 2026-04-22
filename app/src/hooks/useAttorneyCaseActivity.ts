import { useCallback, useEffect, useState } from 'react'
import {
  createLeadInvoice,
  createLeadNegotiation,
  createLeadNote,
  createLeadPayment,
  downloadLeadInvoiceDocx,
  downloadLeadInvoicePdf,
  downloadLeadPaymentReceiptPdf,
  getLeadInvoices,
  getLeadNegotiations,
  getLeadNotes,
  getLeadPayments,
  updateLeadNegotiation,
} from '../lib/api'
import { invalidateAttorneyDashboardSummary } from './useAttorneyDashboardSummary'

const DEFAULT_NEGOTIATION_FORM = {
  eventType: 'offer',
  amount: '',
  eventDate: '',
  status: 'open',
  notes: '',
  counterpartyType: 'insurer',
  insurerName: '',
  adjusterName: '',
  adjusterEmail: '',
  adjusterPhone: '',
  concessionValue: '',
  concessionNotes: '',
  acceptanceRationale: '',
}

const DEFAULT_NOTE_FORM = {
  noteType: 'general',
  message: '',
}

const DEFAULT_INVOICE_FORM = {
  invoiceNumber: '',
  amount: '',
  status: 'open',
  dueDate: '',
  notes: '',
}

const DEFAULT_PAYMENT_FORM = {
  amount: '',
  method: '',
  receivedAt: '',
  reference: '',
  notes: '',
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export function useAttorneyCaseActivity(selectedLeadId?: string) {
  const [negotiationItems, setNegotiationItems] = useState<any[]>([])
  const [noteItems, setNoteItems] = useState<any[]>([])
  const [invoiceItems, setInvoiceItems] = useState<any[]>([])
  const [paymentItems, setPaymentItems] = useState<any[]>([])
  const [negotiationForm, setNegotiationForm] = useState(DEFAULT_NEGOTIATION_FORM)
  const [noteForm, setNoteForm] = useState(DEFAULT_NOTE_FORM)
  const [invoiceForm, setInvoiceForm] = useState(DEFAULT_INVOICE_FORM)
  const [paymentForm, setPaymentForm] = useState(DEFAULT_PAYMENT_FORM)

  const handleAddNegotiation = useCallback(async () => {
    if (!selectedLeadId || !negotiationForm.eventType) return
    try {
      const record = await createLeadNegotiation(selectedLeadId, {
        ...negotiationForm,
        amount: negotiationForm.amount || undefined,
        eventDate: negotiationForm.eventDate || undefined,
        concessionValue: negotiationForm.concessionValue || undefined,
      })
      setNegotiationItems((prev) => [record, ...prev])
      setNegotiationForm(DEFAULT_NEGOTIATION_FORM)
    } catch (err) {
      console.error('Failed to add negotiation event:', err)
    }
  }, [negotiationForm, selectedLeadId])

  const handleUpdateNegotiationStatus = useCallback(async (id: string, status: string) => {
    if (!selectedLeadId) return
    try {
      const record = await updateLeadNegotiation(selectedLeadId, id, { status })
      setNegotiationItems((prev) => prev.map((item) => (item.id === id ? record : item)))
    } catch (err) {
      console.error('Failed to update negotiation event:', err)
    }
  }, [selectedLeadId])

  const handleAddNote = useCallback(async () => {
    if (!selectedLeadId || !noteForm.message.trim()) return
    try {
      const record = await createLeadNote(selectedLeadId, noteForm)
      invalidateAttorneyDashboardSummary()
      setNoteItems((prev) => [record, ...prev])
      setNoteForm(DEFAULT_NOTE_FORM)
    } catch (err) {
      console.error('Failed to add case note:', err)
    }
  }, [noteForm, selectedLeadId])

  const handleAddInvoice = useCallback(async () => {
    if (!selectedLeadId || !invoiceForm.amount) return
    try {
      const record = await createLeadInvoice(selectedLeadId, {
        ...invoiceForm,
        amount: invoiceForm.amount,
        dueDate: invoiceForm.dueDate || undefined,
      })
      invalidateAttorneyDashboardSummary()
      setInvoiceItems((prev) => [record, ...prev])
      setInvoiceForm(DEFAULT_INVOICE_FORM)
    } catch (err) {
      console.error('Failed to add invoice:', err)
    }
  }, [invoiceForm, selectedLeadId])

  const handleAddPayment = useCallback(async () => {
    if (!selectedLeadId || !paymentForm.amount) return
    try {
      const record = await createLeadPayment(selectedLeadId, {
        ...paymentForm,
        amount: paymentForm.amount,
        receivedAt: paymentForm.receivedAt || undefined,
      })
      invalidateAttorneyDashboardSummary()
      setPaymentItems((prev) => [record, ...prev])
      setPaymentForm(DEFAULT_PAYMENT_FORM)
    } catch (err) {
      console.error('Failed to add payment:', err)
    }
  }, [paymentForm, selectedLeadId])

  const handleDownloadInvoiceDocx = useCallback(async (invoiceId: string) => {
    if (!selectedLeadId) return
    try {
      const blob = await downloadLeadInvoiceDocx(selectedLeadId, invoiceId)
      downloadBlob(blob, `invoice-${invoiceId}.docx`)
    } catch (err) {
      console.error('Failed to download invoice docx:', err)
    }
  }, [selectedLeadId])

  const handleDownloadInvoicePdf = useCallback(async (invoiceId: string) => {
    if (!selectedLeadId) return
    try {
      const blob = await downloadLeadInvoicePdf(selectedLeadId, invoiceId)
      downloadBlob(blob, `invoice-${invoiceId}.pdf`)
    } catch (err) {
      console.error('Failed to download invoice pdf:', err)
    }
  }, [selectedLeadId])

  const handleDownloadPaymentReceipt = useCallback(async (paymentId: string) => {
    if (!selectedLeadId) return
    try {
      const blob = await downloadLeadPaymentReceiptPdf(selectedLeadId, paymentId)
      downloadBlob(blob, `payment-${paymentId}.pdf`)
    } catch (err) {
      console.error('Failed to download payment receipt:', err)
    }
  }, [selectedLeadId])

  useEffect(() => {
    if (!selectedLeadId) {
      setNegotiationItems([])
      setNoteItems([])
      setInvoiceItems([])
      setPaymentItems([])
      return
    }

    const loadNegotiations = async () => {
      try {
        const records = await getLeadNegotiations(selectedLeadId)
        setNegotiationItems(Array.isArray(records) ? records : [])
      } catch (err) {
        console.error('Failed to load negotiation events:', err)
        setNegotiationItems([])
      }
    }

    const loadNotes = async () => {
      try {
        const records = await getLeadNotes(selectedLeadId)
        setNoteItems(Array.isArray(records) ? records : [])
      } catch (err) {
        console.error('Failed to load case notes:', err)
        setNoteItems([])
      }
    }

    const loadInvoices = async () => {
      try {
        const records = await getLeadInvoices(selectedLeadId)
        setInvoiceItems(Array.isArray(records) ? records : [])
      } catch (err) {
        console.error('Failed to load invoices:', err)
        setInvoiceItems([])
      }
    }

    const loadPayments = async () => {
      try {
        const records = await getLeadPayments(selectedLeadId)
        setPaymentItems(Array.isArray(records) ? records : [])
      } catch (err) {
        console.error('Failed to load payments:', err)
        setPaymentItems([])
      }
    }

    void loadNegotiations()
    void loadNotes()
    void loadInvoices()
    void loadPayments()
  }, [selectedLeadId])

  return {
    handleAddInvoice,
    handleAddNegotiation,
    handleAddNote,
    handleAddPayment,
    handleDownloadInvoiceDocx,
    handleDownloadInvoicePdf,
    handleDownloadPaymentReceipt,
    handleUpdateNegotiationStatus,
    invoiceForm,
    invoiceItems,
    negotiationForm,
    negotiationItems,
    noteForm,
    noteItems,
    paymentForm,
    paymentItems,
    setInvoiceForm,
    setNegotiationForm,
    setNoteForm,
    setPaymentForm,
  }
}
