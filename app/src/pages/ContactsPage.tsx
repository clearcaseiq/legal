/**
 * Contacts list page - shows all case contacts with Add, Edit, and Delete.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus, Mail, Phone, Building2, Pencil, Trash2, Users } from 'lucide-react'
import { getAllCaseContacts, updateCaseContact, deleteCaseContact } from '../lib/api'
import LeadPickerModal from '../components/LeadPickerModal'
import EditContactModal from '../components/EditContactModal'
import EmptyState from '../components/EmptyState'
import { useToast } from '../contexts/ToastContext'
import { invalidateAttorneyDashboardSummary, loadAttorneyDashboardSummary } from '../hooks/useAttorneyDashboardSummary'

const claimLabel = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())

export default function ContactsPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [contacts, setContacts] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [editContact, setEditContact] = useState<any>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [deleteContact, setDeleteContact] = useState<any>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const loadContacts = () => {
    setLoading(true)
    getAllCaseContacts()
      .then((data) => setContacts(Array.isArray(data) ? data : []))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadContacts()
  }, [])

  useEffect(() => {
    if (!deleteContact) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleteBusy) setDeleteContact(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deleteContact, deleteBusy])

  const handleAddClick = () => {
    setAddModalOpen(true)
    if (leads.length === 0) {
      setLeadsLoading(true)
      loadAttorneyDashboardSummary()
        .then((d) => setLeads(d?.recentLeads ?? []))
        .catch(() => setLeads([]))
        .finally(() => setLeadsLoading(false))
    }
  }

  const handleSelectCase = (lead: any) => {
    setAddModalOpen(false)
    navigate(`/attorney-dashboard/add-contact/${lead.id}`, { state: { returnTo: 'contacts' } })
  }

  const handleEditSubmit = async (payload: any) => {
    if (!editContact?.id || !editContact?.leadId) return
    setEditLoading(true)
    try {
      await updateCaseContact(editContact.leadId, editContact.id, payload)
      invalidateAttorneyDashboardSummary()
      loadContacts()
      setEditContact(null)
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteContact?.id || !deleteContact?.leadId) return
    const toRemove = deleteContact
    const snapshot = contacts
    setContacts((prev) => prev.filter((c) => c.id !== toRemove.id))
    setDeleteContact(null)
    setDeleteBusy(true)
    try {
      await deleteCaseContact(toRemove.leadId, toRemove.id)
      invalidateAttorneyDashboardSummary()
      showToast({
        variant: 'success',
        title: 'Contact removed',
        message: `${toRemove.firstName ?? ''} ${toRemove.lastName ?? ''}`.trim() || undefined,
      })
    } catch (err) {
      console.error('Failed to delete contact:', err)
      setContacts(snapshot)
      showToast({
        variant: 'error',
        title: 'Could not delete contact',
        message: 'Check your connection and try again.',
      })
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          type="button"
          onClick={() => navigate('/attorney-dashboard')}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-6 pressable rounded-lg px-1 -ml-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-ui-2xl font-semibold font-display text-slate-900 dark:text-slate-100 tracking-tight">
            Contacts
          </h1>
          <button
            type="button"
            onClick={handleAddClick}
            className="btn-primary flex items-center gap-2 text-ui-sm"
          >
            <UserPlus className="h-4 w-4" />
            Add contact
          </button>
        </div>

        <div className="surface-panel overflow-hidden p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
            </div>
          ) : contacts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No contacts yet"
              description="Link people to your cases so you can reach witnesses, providers, or other parties in one place."
            >
              <button type="button" onClick={handleAddClick} className="btn-primary text-ui-sm inline-flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add your first contact
              </button>
            </EmptyState>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {contacts.map((c) => (
                <li
                  key={c.id}
                  className="px-6 py-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {c.firstName} {c.lastName}
                        </span>
                        {c.contactType && (
                          <span className="text-ui-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {claimLabel(c.contactType)}
                          </span>
                        )}
                      </div>
                      {c.title && (
                        <p className="text-ui-sm text-slate-500 dark:text-slate-400 mt-0.5">{c.title}</p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-ui-sm text-slate-600 dark:text-slate-300">
                        {c.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            {c.email}
                          </span>
                        )}
                        {c.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            {c.phone}
                          </span>
                        )}
                        {c.companyName && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            {c.companyName}
                          </span>
                        )}
                      </div>
                      {c.lead?.assessment && (
                        <p className="text-xs text-gray-400 mt-2">
                          Case: {claimLabel(c.lead.assessment.claimType || '—')}
                          {[c.lead.assessment.venueCounty, c.lead.assessment.venueState].filter(Boolean).length > 0 && (
                            <> · {[c.lead.assessment.venueCounty, c.lead.assessment.venueState].filter(Boolean).join(', ')}</>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditContact(c)}
                        className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 rounded-lg pressable"
                        title="Edit contact"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteContact(c)}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg pressable"
                        title="Delete contact"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <LeadPickerModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        leads={leads}
        title="Select case to add contact"
        onSelect={handleSelectCase}
        emptyMessage={leadsLoading ? 'Loading cases...' : 'No cases available. Add a lead first.'}
      />

      <EditContactModal
        isOpen={!!editContact}
        onClose={() => setEditContact(null)}
        contact={editContact}
        onSubmit={handleEditSubmit}
        loading={editLoading}
      />

      {deleteContact && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <div
            className="absolute inset-0 bg-black/50"
            aria-hidden
            onClick={() => !deleteBusy && setDeleteContact(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-contact-title"
            className="relative surface-panel shadow-xl max-w-md w-full p-6"
          >
            <h3 id="delete-contact-title" className="text-ui-lg font-semibold text-slate-900 dark:text-slate-100">
              Delete contact
            </h3>
            <p className="mt-2 text-ui-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to delete {deleteContact.firstName} {deleteContact.lastName}? This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => setDeleteContact(null)}
                className="btn-outline text-ui-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl text-ui-sm font-medium bg-red-600 text-white hover:bg-red-700 pressable disabled:opacity-50"
              >
                {deleteBusy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
