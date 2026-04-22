/**
 * Post-Acceptance View - Case command center for attorneys.
 * Mission control panel: every button triggers a clear workflow connecting attorney, plaintiff, and system.
 */

import { useState } from 'react'
import { Phone, MessageSquare, Calendar, Download, ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { formatCurrency } from '../lib/formatters'
import { CallPlaintiffModal, MessagePlaintiffModal, ScheduleConsultModal } from './CaseCommandModals'

function formatClaimType(s: string) {
  return (s || 'unknown').replace(/_/g, ' ')
}

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

function CollapsibleSection({ title, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100"
      >
        <span>{title}</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && <div className="p-4 border-t border-gray-200 text-sm text-gray-600">{children}</div>}
    </div>
  )
}

interface PostAcceptanceViewProps {
  selectedLead: any
  facts: any
  bands: any
  analysis: any
  severity: { level: number; label: string }
  adjuster: { posture: string; risk: string }
  keyDrivers: string[]
  confidenceScore: number
  venueSignal: string
  comparableCount: number | null
  treatments: any[]
  deterministicChronology: { summary: string; timeline: string[]; providerGroups: string[]; gapsAndRedFlags?: string[] }
  treatmentContinuity: string
  injuryTypes: string[]
  incidentDate: string
  incidentSummary: string
  insurance: string
  liabilityScore: number
  comparativeRisk: string
  liabilityFactors: string[]
  missingTreatmentStatus: string
  missingTreatmentSeverity: string
  outcomeDirection: string
  filesCount: number
  leadEvidenceFiles: any[]
  contactHistory: any[]
  negotiationItems: any[]
  taskItems: any[]
  noteItems: any[]
  onCall: () => void
  onMessage: () => void
  onScheduleConsult: () => void
  onDownloadCaseFile: () => void
  onCreateContact?: (payload: { contactType: string; contactMethod?: string; scheduledAt?: string; notes?: string }) => Promise<void>
  onRefresh?: () => void
  onRegenerateAnalysis?: () => void
  analysisLoading?: boolean
  caseFileLoading?: boolean
}

export default function PostAcceptanceView({
  selectedLead,
  facts,
  bands,
  analysis,
  severity,
  adjuster,
  keyDrivers,
  confidenceScore,
  venueSignal,
  comparableCount,
  treatments,
  deterministicChronology,
  treatmentContinuity,
  injuryTypes,
  incidentDate,
  incidentSummary,
  insurance,
  liabilityScore,
  comparativeRisk,
  liabilityFactors,
  missingTreatmentStatus,
  missingTreatmentSeverity,
  outcomeDirection,
  filesCount,
  leadEvidenceFiles,
  contactHistory,
  negotiationItems,
  taskItems,
  noteItems,
  onCall,
  onMessage,
  onScheduleConsult,
  onDownloadCaseFile,
  onCreateContact,
  onRefresh,
  onRegenerateAnalysis,
  analysisLoading,
  caseFileLoading
}: PostAcceptanceViewProps) {
  const [callModalOpen, setCallModalOpen] = useState(false)
  const [messageModalOpen, setMessageModalOpen] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [evidenceExpanded, setEvidenceExpanded] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)

  const claimType = formatClaimType(selectedLead?.assessment?.claimType || '')
  const location = [selectedLead?.assessment?.venueCounty, selectedLead?.assessment?.venueState]
    .filter(Boolean)
    .join(', ') || '—'
  const valueLow = bands?.p25 ?? bands?.low ?? 0
  const valueHigh = bands?.p75 ?? bands?.high ?? bands?.median ?? 0
  const caseScore = Math.round((selectedLead?.viabilityScore ?? 0) * 100)
  const caseStrength = caseScore >= 70 ? 'Strong' : caseScore >= 40 ? 'Moderate' : 'Weak'

  const injury = injuryTypes.length > 0 ? injuryTypes[0] : 'Not documented'
  const treatment = treatments.length > 0 ? 'Yes' : 'No'
  const evidenceCount = filesCount + leadEvidenceFiles.length

  const medicalCount = leadEvidenceFiles.filter((f: any) => f?.category === 'medical').length + (treatments.length > 0 ? 1 : 0)
  const photosCount = leadEvidenceFiles.filter((f: any) => f?.category === 'photos').length
  const policeCount = leadEvidenceFiles.filter((f: any) => f?.category === 'police').length
  const wageLossCount = leadEvidenceFiles.filter((f: any) => f?.category === 'wage' || f?.category === 'wage_loss').length
  const hasMedical = medicalCount > 0
  const hasPolice = policeCount > 0
  const hasPhotos = photosCount > 0

  const evidenceList = [
    { label: 'Medical Records', status: hasMedical, count: medicalCount },
    { label: 'Injury Photos', status: hasPhotos, count: photosCount },
    { label: 'Police Report', status: hasPolice, count: policeCount },
    { label: 'Wage Loss Docs', status: wageLossCount > 0, count: wageLossCount }
  ]
  const evidenceUploaded = evidenceList.filter((e) => e.status).length
  const evidenceScore = Math.round((evidenceUploaded / evidenceList.length) * 100)

  const firstName = selectedLead?.assessment?.user?.firstName || ''
  const lastName = selectedLead?.assessment?.user?.lastName || ''
  const plaintiffName = `${firstName} ${lastName.charAt(0) || ''}.`.trim() || 'Not provided'
  const ageRange = facts?.claimant?.ageRange || facts?.personal?.ageRange || facts?.ageRange || '—'

  const nextActions: string[] = []
  if (contactHistory.length === 0) nextActions.push('Call plaintiff to confirm injuries')
  if (!hasPolice) nextActions.push('Request police report')
  if (!hasMedical) nextActions.push('Upload medical bills')
  if (contactHistory.length === 0) nextActions.push('Schedule consultation')
  if (nextActions.length === 0) nextActions.push('Review case and prepare demand letter')

  const formatShortDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const activityItems: { time: string; label: string }[] = []
  const incidentDateForTimeline = facts?.incident?.date
  const submittedAt = selectedLead?.submittedAt || selectedLead?.assessment?.createdAt
  if (incidentDateForTimeline) activityItems.push({ time: formatShortDate(String(incidentDateForTimeline)), label: 'Accident' })
  if (submittedAt) activityItems.push({ time: formatShortDate(String(submittedAt)), label: 'Intake submitted' })
  if (selectedLead?.status === 'contacted' || selectedLead?.status === 'consulted' || selectedLead?.status === 'retained') {
    activityItems.push({ time: submittedAt ? formatShortDate(String(submittedAt)) : '—', label: 'Case accepted' })
  }
  if (leadEvidenceFiles.length > 0) {
    activityItems.push({ time: '—', label: 'Medical records uploaded' })
  }
  activityItems.reverse()

  const latestDemand = negotiationItems.find((n: any) => n.type === 'demand' || n.status === 'demand')
  const latestOffer = negotiationItems.find((n: any) => n.type === 'offer' || n.status === 'offer')

  // Status lifecycle: Case Submitted → Attorney Reviewing → Consultation Pending → Consultation Scheduled → Negotiation → Litigation → Closed
  const caseStatusLabel =
    selectedLead?.status === 'retained'
      ? 'Retained'
      : selectedLead?.status === 'consulted'
        ? 'Consultation Completed'
        : selectedLead?.status === 'contacted'
          ? 'Consultation Pending'
          : 'Attorney Reviewing'
  const hasConsultScheduled = contactHistory.some((c: any) => c.contactType === 'consult' && c.scheduledAt)
  const displayStatus = hasConsultScheduled && selectedLead?.status === 'contacted'
    ? 'Consultation Scheduled'
    : caseStatusLabel

  const timelineEstimate = treatments.length >= 2 ? '8–14 months' : treatments.length === 1 ? '6–12 months' : '—'

  const phone = selectedLead?.assessment?.user?.phone || ''
  const email = selectedLead?.assessment?.user?.email || ''
  const preferredContact = phone ? 'Phone' : email ? 'Email' : '—'

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

  return (
    <div className="space-y-6">
      {/* Section 1 — Case Command Header (mission control panel) */}
      <div className="rounded-xl border-2 border-brand-200 bg-brand-50/30 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-gray-600 mb-3">
          <div><span className="text-gray-500">Status:</span> <strong className="text-gray-900">{displayStatus}</strong></div>
          <div><span className="text-gray-500">Case Type:</span> <strong className="text-gray-900">{claimType}</strong></div>
          <div><span className="text-gray-500">Venue:</span> <strong className="text-gray-900">{location}</strong></div>
          <div><span className="text-gray-500">Case Score:</span> <strong className="text-gray-900">{caseScore} ({caseStrength})</strong></div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          {claimType} – {location}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
          <span>
            Estimated Value: <strong>{valueLow && valueHigh ? `${formatCurrency(valueLow)}–${formatCurrency(valueHigh)}` : '—'}</strong>
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <button
            onClick={() => setEvidenceExpanded(!evidenceExpanded)}
            className="inline-flex items-center gap-1 hover:text-brand-600 focus:outline-none"
          >
            Evidence: {evidenceCount} document{evidenceCount !== 1 ? 's' : ''}
            {evidenceExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          <span>Treatment: {treatment}</span>
          <span>Timeline: {timelineEstimate}</span>
        </div>
        {evidenceExpanded && (
          <div className="mt-3 p-3 rounded-lg bg-white/60 border border-brand-100">
            <div className="space-y-1.5 text-sm mb-3">
              {evidenceList.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  {item.status ? <span className="text-green-600">✔</span> : <span className="text-gray-400">✘</span>}
                  <span className={item.status ? 'text-gray-900' : 'text-gray-500'}>
                    {item.label} ({item.count})
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50">
                Request Documents
              </button>
              <button className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
                Send Upload Link
              </button>
            </div>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={useModals ? () => setCallModalOpen(true) : onCall}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700"
          >
            <Phone className="h-4 w-4" />
            Call Plaintiff
          </button>
          <button
            onClick={useModals ? () => setMessageModalOpen(true) : onMessage}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 border border-brand-300 rounded-lg hover:bg-brand-50"
          >
            <MessageSquare className="h-4 w-4" />
            Send Message
          </button>
          <button
            onClick={useModals ? () => setScheduleModalOpen(true) : onScheduleConsult}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 border border-brand-300 rounded-lg hover:bg-brand-50"
          >
            <Calendar className="h-4 w-4" />
            Schedule Consult
          </button>
          <button
            onClick={onDownloadCaseFile}
            disabled={caseFileLoading}
            title="Generate a structured case packet: Case Summary, Incident Narrative, Medical Chronology, Evidence List, AI Analysis, Estimated Settlement Range"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {caseFileLoading ? 'Preparing…' : 'Download Case File'}
          </button>
        </div>
      </div>

      {/* Case Command Modals */}
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

      {/* Section 2 — Case Snapshot */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Case Snapshot</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Incident Date</span>
            <p className="font-medium">{incidentDate}</p>
          </div>
          <div>
            <span className="text-gray-500">Jurisdiction</span>
            <p className="font-medium">{location}</p>
          </div>
          <div>
            <span className="text-gray-500">Injury Summary</span>
            <p className="font-medium">{injury}</p>
          </div>
          <div>
            <span className="text-gray-500">Liability Confidence</span>
            <p className="font-medium">{Math.round(liabilityScore * 100)}%</p>
          </div>
          <div>
            <span className="text-gray-500">Evidence Count</span>
            <p className="font-medium">{evidenceCount}</p>
          </div>
        </div>
      </div>

      {/* Section 3 — Next Best Action */}
      <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Next Best Actions</h3>
        <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
          {nextActions.slice(0, 4).map((action, i) => (
            <li key={i}>{action}</li>
          ))}
        </ol>
      </div>

      {/* Section 4 — Evidence Dashboard */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Evidence</h3>
        <div className="space-y-2 text-sm mb-3">
          {evidenceList.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              {item.status ? (
                <span className="text-green-600">✔</span>
              ) : (
                <span className="text-gray-400">✘</span>
              )}
              <span className={item.status ? 'text-gray-900' : 'text-gray-500'}>{item.label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50">
            Request Documents
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
            Send Upload Link
          </button>
        </div>
      </div>

      {/* Section 5 — Medical Chronology */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Treatment Timeline</h3>
        {(() => {
          const incidentDateStr = facts?.incident?.date
            ? new Date(facts.incident.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : null
          const timelineEntries: { date: string; label: string }[] = []
          if (incidentDateStr) timelineEntries.push({ date: incidentDateStr, label: 'Accident' })
          deterministicChronology.timeline.forEach((entry) => {
            const parts = entry.split(' — ')
            const date = parts[0] || '—'
            const rest = parts.slice(1).join(' — ') || entry
            timelineEntries.push({ date, label: rest })
          })
          return timelineEntries.length > 0 ? (
            <div className="space-y-2">
              {timelineEntries.map((entry, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span className="text-gray-600 font-medium shrink-0 w-24">{entry.date}</span>
                  <span className="text-gray-700">– {entry.label}</span>
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-2">Continuity: {treatmentContinuity}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No treatment timeline yet</p>
          )
        })()}
      </div>

      {/* Section 6 — Negotiation Tracker */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Negotiation Tracker</h3>
        <div className="space-y-2 text-sm mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 w-28">Demand Sent</span>
            <span className={latestDemand ? 'text-green-600 font-medium' : 'text-gray-500'}>
              {latestDemand ? '✓' : '—'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 w-28">Offer Received</span>
            <span className={latestOffer ? 'text-green-600 font-medium' : 'text-gray-500'}>
              {latestOffer ? '✓' : '—'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 w-28">Counter Offer</span>
            <span className={negotiationItems.length > 1 ? 'text-green-600 font-medium' : 'text-gray-500'}>
              {negotiationItems.length > 1 ? '✓' : '—'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 w-28">Settlement</span>
            <span className="text-gray-500">—</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50">
            Add Offer
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50">
            Add Counter
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-md hover:bg-brand-50">
            <FileText className="h-3 w-3 inline mr-1" />
            Generate Demand Letter
          </button>
        </div>
      </div>

      {/* Section 7 — Case Intelligence (AI) - Collapsible */}
      <CollapsibleSection title="Case Intelligence (AI)" defaultOpen={false}>
        <div className="space-y-3">
          <div>
            <span className="text-gray-500">Case Strength:</span> {caseStrength}
          </div>
          <div>
            <span className="text-gray-500">Venue multiplier:</span> {venueSignal || '—'}
          </div>
          <div>
            <span className="text-gray-500">Adjuster posture:</span> {adjuster.posture}
          </div>
          <div>
            <span className="text-gray-500">Comparable cases:</span> {comparableCount != null ? comparableCount : '—'}
          </div>
          <div>
            <span className="text-gray-500">Severity scoring:</span> {severity.label}
          </div>
          {onRegenerateAnalysis && (
            <button
              onClick={onRegenerateAnalysis}
              disabled={analysisLoading}
              className="mt-2 px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50"
            >
              {analysisLoading ? 'Regenerating…' : 'Regenerate Analysis'}
            </button>
          )}
        </div>
      </CollapsibleSection>

      {/* Section 8 — Team Collaboration */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Team Notes</h3>
        {noteItems.length > 0 ? (
          <div className="space-y-2 text-sm">
            {noteItems.slice(0, 3).map((note: any, i: number) => (
              <div key={i} className="p-2 bg-gray-50 rounded border border-gray-100">
                {note.content || note.body || note.text || '—'}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No team notes yet. Add quick notes for internal collaboration.</p>
        )}
      </div>

      {/* Section 9 — Case Timeline */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Case Timeline</h3>
        <div className="space-y-2 text-sm">
          {activityItems.length > 0 ? (
            activityItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-gray-600 font-medium shrink-0 w-28">{item.time}</span>
                <span className="text-gray-700">– {item.label}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No activity yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
