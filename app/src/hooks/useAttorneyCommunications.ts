import { useCallback, useEffect, useState } from 'react'
import { createLeadContact, getLeadContacts } from '../lib/api'
import { invalidateAttorneyDashboardSummary } from './useAttorneyDashboardSummary'

type LeadLike = {
  id: string
  status?: string
  assessment?: {
    user?: {
      phone?: string
      email?: string
    }
  }
}

type UpdateLeadInState = (leadId: string, updates: Partial<LeadLike>) => void

export function useAttorneyCommunications(
  selectedLead: LeadLike | null,
  recentLeads: LeadLike[],
  updateLeadInState: UpdateLeadInState,
  setSelectedLead: (lead: LeadLike) => void,
  setWorkstreamTab: (tab: string) => void,
  setPageError: (message: string) => void,
) {
  const [contactLoading, setContactLoading] = useState(false)
  const [contactHistory, setContactHistory] = useState<any[]>([])
  const [contactForm, setContactForm] = useState({
    contactType: 'call',
    contactMethod: '',
    scheduledAt: '',
    notes: '',
  })

  const formatDateTimeLocal = useCallback((date: Date) => {
    const pad = (value: number) => String(value).padStart(2, '0')
    const year = date.getFullYear()
    const month = pad(date.getMonth() + 1)
    const day = pad(date.getDate())
    const hours = pad(date.getHours())
    const minutes = pad(date.getMinutes())
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }, [])

  const resolveQuickLead = useCallback(() => {
    if (selectedLead) return selectedLead
    if (!recentLeads.length) {
      setPageError('No leads available for quick action')
      return null
    }
    const preferred = recentLeads.find((lead) => ['contacted', 'consulted', 'retained'].includes(lead.status || '')) || recentLeads[0]
    setSelectedLead(preferred)
    return preferred
  }, [recentLeads, selectedLead, setPageError, setSelectedLead])

  const logQuickContact = useCallback(async (lead: LeadLike, payload: { contactType: string; contactMethod?: string; scheduledAt?: string; notes?: string }) => {
    try {
      setContactLoading(true)
      await createLeadContact(lead.id, payload)
      invalidateAttorneyDashboardSummary()
      if (selectedLead?.id === lead.id) {
        const contacts = await getLeadContacts(lead.id)
        setContactHistory(Array.isArray(contacts) ? contacts : [])
      }
      if (payload.contactType === 'consult') {
        updateLeadInState(lead.id, { status: 'consulted' })
      }
    } catch (err) {
      console.error('Failed to log quick contact:', err)
    } finally {
      setContactLoading(false)
    }
  }, [selectedLead?.id, updateLeadInState])

  const reloadContacts = useCallback(async (leadId?: string) => {
    if (!leadId) return
    try {
      setContactLoading(true)
      const contacts = await getLeadContacts(leadId)
      setContactHistory(Array.isArray(contacts) ? contacts : [])
    } catch (err) {
      console.error('Failed to load contact history:', err)
    } finally {
      setContactLoading(false)
    }
  }, [])

  const handleLogContact = useCallback(async () => {
    if (!selectedLead?.id) return
    try {
      setContactLoading(true)
      await createLeadContact(selectedLead.id, {
        contactType: contactForm.contactType,
        contactMethod: contactForm.contactMethod || undefined,
        scheduledAt: contactForm.scheduledAt || undefined,
        notes: contactForm.notes || undefined,
      })
      invalidateAttorneyDashboardSummary()
      await reloadContacts(selectedLead.id)
      setContactForm({ contactType: 'call', contactMethod: '', scheduledAt: '', notes: '' })
    } catch (err) {
      console.error('Failed to log contact:', err)
    } finally {
      setContactLoading(false)
    }
  }, [contactForm, reloadContacts, selectedLead?.id])

  const handleCreateContactFromCommand = useCallback(async (payload: { contactType: string; contactMethod?: string; scheduledAt?: string; notes?: string }) => {
    if (!selectedLead?.id) return
    try {
      setContactLoading(true)
      await createLeadContact(selectedLead.id, payload)
      invalidateAttorneyDashboardSummary()
      await reloadContacts(selectedLead.id)
      if (payload.contactType === 'consult') {
        updateLeadInState(selectedLead.id, { status: 'consulted' })
      }
    } catch (err) {
      console.error('Failed to create contact from command:', err)
    } finally {
      setContactLoading(false)
    }
  }, [reloadContacts, selectedLead?.id, updateLeadInState])

  const handleQuickCall = useCallback(async () => {
    const lead = resolveQuickLead()
    if (!lead) return
    const phone = lead.assessment?.user?.phone || ''
    setContactForm((prev) => ({ ...prev, contactType: 'call', contactMethod: phone, scheduledAt: '', notes: 'Quick action: Call now' }))
    setWorkstreamTab('communications')
    await logQuickContact(lead, { contactType: 'call', contactMethod: phone || undefined, notes: 'Quick action: Call now' })
  }, [logQuickContact, resolveQuickLead, setWorkstreamTab])

  const handleQuickMessage = useCallback(async () => {
    const lead = resolveQuickLead()
    if (!lead) return
    const phone = lead.assessment?.user?.phone || ''
    const email = lead.assessment?.user?.email || ''
    const contactType = phone ? 'sms' : 'email'
    const contactMethod = phone || email || ''
    setContactForm((prev) => ({ ...prev, contactType, contactMethod, scheduledAt: '', notes: 'Quick action: Send message' }))
    setWorkstreamTab('communications')
    await logQuickContact(lead, { contactType, contactMethod: contactMethod || undefined, notes: 'Quick action: Send message' })
  }, [logQuickContact, resolveQuickLead, setWorkstreamTab])

  const handleQuickConsult = useCallback(async () => {
    const lead = resolveQuickLead()
    if (!lead) return
    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const scheduledAtLocal = formatDateTimeLocal(scheduledAt)
    setContactForm((prev) => ({ ...prev, contactType: 'consult', scheduledAt: scheduledAtLocal, notes: 'Quick action: Schedule consult' }))
    setWorkstreamTab('communications')
    await logQuickContact(lead, { contactType: 'consult', scheduledAt: scheduledAt.toISOString(), notes: 'Quick action: Schedule consult' })
  }, [formatDateTimeLocal, logQuickContact, resolveQuickLead, setWorkstreamTab])

  useEffect(() => {
    if (!selectedLead?.id) return
    void reloadContacts(selectedLead.id)
  }, [reloadContacts, selectedLead?.id])

  return {
    contactForm,
    contactHistory,
    contactLoading,
    handleCreateContactFromCommand,
    handleLogContact,
    handleQuickCall,
    handleQuickConsult,
    handleQuickMessage,
    reloadContacts,
    setContactForm,
  }
}
