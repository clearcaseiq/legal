/**
 * Persistent Case Header - Always visible across all tabs.
 * Compact context bar: case identity + key metrics + action buttons.
 * No repetition of full case details.
 */

import { useState } from 'react'
import { Phone, MessageSquare, Calendar, Download, FileText } from 'lucide-react'
import { formatCurrency } from '../lib/formatters'
import { CallPlaintiffModal, MessagePlaintiffModal, ScheduleConsultModal } from './CaseCommandModals'

function formatClaimType(s: string) {
  return (s || 'unknown').replace(/_/g, ' ')
}

export interface PersistentCaseHeaderProps {
  claimType: string
  location: string
  caseScore: number
  caseStrength: string
  valueLow: number
  valueHigh: number
  evidenceCount: number
  treatment: string
  timelineEstimate: string
  liabilityPercent?: number
  caseStatus?: string
  plaintiffName: string
  phone: string
  email: string
  preferredContact: string
  contactHistory: any[]
  onCall: () => void
  onMessage: () => void
  onScheduleConsult: () => void
  /** When provided, Message button opens in-app chat drawer instead of contact modal */
  onOpenChat?: () => void
  onDownloadCaseFile: () => void
  onCreateContact?: (payload: { contactType: string; contactMethod?: string; scheduledAt?: string; notes?: string }) => Promise<void>
  onRefresh?: () => void
  caseFileLoading?: boolean
  onGenerateDemandLetter?: () => void
  demandLetterLoading?: boolean
  casePriority?: string
  solYearsRemaining?: number
  solDeadline?: string
}

export default function PersistentCaseHeader({
  claimType,
  location,
  caseScore,
  caseStrength,
  valueLow,
  valueHigh,
  evidenceCount,
  treatment,
  timelineEstimate,
  liabilityPercent = 0,
  caseStatus = 'Consultation Pending',
  plaintiffName,
  phone,
  email,
  preferredContact,
  contactHistory,
  onCall,
  onMessage,
  onScheduleConsult,
  onDownloadCaseFile,
  onCreateContact,
  onOpenChat,
  onRefresh,
  caseFileLoading,
  onGenerateDemandLetter,
  demandLetterLoading = false,
  casePriority,
  solYearsRemaining,
  solDeadline
}: PersistentCaseHeaderProps) {
  const [callModalOpen, setCallModalOpen] = useState(false)
  const [messageModalOpen, setMessageModalOpen] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)

  const handleLogCallOutcome = async (outcome: string, notes?: string) => {
    if (!onCreateContact) return
    setModalLoading(true)
    try {
      await onCreateContact({
        contactType: 'call',
        contactMethod: phone || undefined,
        notes: `Outcome: ${outcome}. ${notes || ''}`.trim()
      })
      onRefresh?.()
    } finally {
      setModalLoading(false)
    }
  }

  const handleSendMessage = async (message: string) => {
    if (!onCreateContact) return
    setModalLoading(true)
    try {
      const contactType = phone ? 'sms' : 'email'
      const contactMethod = phone || email
      await onCreateContact({
        contactType,
        contactMethod: contactMethod || undefined,
        notes: message
      })
      onRefresh?.()
    } finally {
      setModalLoading(false)
    }
  }

  const handleScheduleConsult = async (scheduledAt: string, meetingType: 'phone' | 'zoom' | 'in-person') => {
    if (!onCreateContact) return
    setModalLoading(true)
    try {
      await onCreateContact({
        contactType: 'consult',
        scheduledAt,
        notes: `Consultation scheduled. Meeting type: ${meetingType}`
      })
      onRefresh?.()
    } finally {
      setModalLoading(false)
    }
  }

  const useModals = Boolean(onCreateContact)
  const displayClaimType = formatClaimType(claimType)

  const statusColors: Record<string, string> = {
    'Consultation Pending': 'bg-amber-100 text-amber-800 border-amber-200',
    'Consultation Scheduled': 'bg-blue-100 text-blue-800 border-blue-200',
    'Negotiation': 'bg-brand-100 text-brand-800 border-brand-200',
    'Litigation': 'bg-purple-100 text-purple-800 border-purple-200',
    'Closed': 'bg-gray-100 text-gray-700 border-gray-200',
    'Retained': 'bg-green-100 text-green-800 border-green-200'
  }
  const statusClass = statusColors[caseStatus] || 'bg-amber-100 text-amber-800 border-amber-200'

  const priorityClass = casePriority === 'High' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : casePriority === 'Low' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-blue-100 text-blue-800 border-blue-200'

  return (
    <>
      <div className="sticky top-14 md:top-16 z-30 rounded-xl border border-brand-200/80 dark:border-brand-800/60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm px-4 py-2.5 mb-4 motion-safe:transition-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border shrink-0 ${statusClass}`}>
              {caseStatus}
            </span>
            {casePriority && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border shrink-0 ${priorityClass}`}>
                Priority: {casePriority}
              </span>
            )}
            <span className="font-semibold text-gray-900">
              {displayClaimType} — {location}
            </span>
            <span className="text-gray-600">
              <strong>{caseStrength}</strong> ({caseScore}) · Est: <strong>{valueLow && valueHigh ? `${formatCurrency(valueLow)}–${formatCurrency(valueHigh)}` : '—'}</strong>
            </span>
            <span className="text-gray-500">Evidence: {evidenceCount} | Treatment: {treatment} | Liability: {liabilityPercent}%</span>
            {solYearsRemaining != null && solDeadline && (
              <span className="text-gray-500">· SOL: {solYearsRemaining} yr{solYearsRemaining !== 1 ? 's' : ''} left (deadline {solDeadline})</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={useModals ? () => setCallModalOpen(true) : onCall}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700"
            >
              <Phone className="h-3.5 w-3.5" />
              Call
            </button>
            <button
              onClick={onOpenChat ? onOpenChat : (useModals ? () => setMessageModalOpen(true) : onMessage)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-brand-600 border border-brand-300 rounded-md hover:bg-brand-50"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Message
            </button>
            <button
              onClick={useModals ? () => setScheduleModalOpen(true) : onScheduleConsult}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-brand-600 border border-brand-300 rounded-md hover:bg-brand-50"
            >
              <Calendar className="h-3.5 w-3.5" />
              Consult
            </button>
            {onGenerateDemandLetter && (
              <button
                onClick={onGenerateDemandLetter}
                disabled={demandLetterLoading}
                title="Generate AI demand letter"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-emerald-700 border border-emerald-300 rounded-md hover:bg-emerald-50 disabled:opacity-50"
              >
                <FileText className="h-3.5 w-3.5" />
                {demandLetterLoading ? '…' : 'Demand Letter'}
              </button>
            )}
            <button
              onClick={onDownloadCaseFile}
              disabled={caseFileLoading}
              title="Generate case packet: Summary, Chronology, Evidence, AI Analysis"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              {caseFileLoading ? '…' : 'Download'}
            </button>
          </div>
        </div>
      </div>

      {useModals && (
        <>
          <CallPlaintiffModal
            open={callModalOpen}
            onClose={() => setCallModalOpen(false)}
            plaintiffName={plaintiffName}
            phone={phone}
            preferredContact={preferredContact}
            onLogOutcome={handleLogCallOutcome}
            loading={modalLoading}
          />
          <MessagePlaintiffModal
            open={messageModalOpen}
            onClose={() => setMessageModalOpen(false)}
            plaintiffName={plaintiffName}
            contactHistory={contactHistory}
            onSendMessage={handleSendMessage}
            loading={modalLoading}
          />
          <ScheduleConsultModal
            open={scheduleModalOpen}
            onClose={() => setScheduleModalOpen(false)}
            plaintiffName={plaintiffName}
            onSchedule={handleScheduleConsult}
            loading={modalLoading}
          />
        </>
      )}
    </>
  )
}
