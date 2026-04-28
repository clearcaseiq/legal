import type { Dispatch, SetStateAction } from 'react'
import { Lock, LockOpen, MessageSquare, Phone, Star, Users } from 'lucide-react'

type CaseLeadsFilter = {
  caseType: string
  valueRange: string
  status: string
  pipelineStage: string
  evidenceLevel: string
  jurisdiction: string
  routingInboxView?: 'awaitingDecision' | 'hotMatches' | 'staleMatches' | 'consultReady' | ''
}

type PendingQuickAction = {
  action: string
  section?: string
} | null

type AttorneyDashboardLeadsTabProps = {
  activePipelineTile: string | null
  bulkActionLoading: boolean
  bulkActionMessage: string | null
  caseLeadsFilter: CaseLeadsFilter
  dashboardData: any
  formatCurrency: (value: number) => string
  onAcceptLead: (leadId: string) => void
  onDeclineLead: (leadId: string) => void
  onHandleQuickActionForLead: (lead: any, action: string, section?: string) => void
  onOpenDocumentRequest: () => void
  onOpenLead: (lead: any) => void
  onOpenLeadChat: (lead: any) => void
  onOpenScheduleConsult: () => void
  pendingQuickAction: PendingQuickAction
  selectedLeadIds: Set<string>
  setActivePipelineTile: (value: string | null) => void
  setCaseLeadsFilter: Dispatch<SetStateAction<CaseLeadsFilter>>
  setPendingQuickAction: Dispatch<SetStateAction<PendingQuickAction>>
  setSelectedLeadIds: Dispatch<SetStateAction<Set<string>>>
  setStarredLeadIds: Dispatch<SetStateAction<Set<string>>>
  starredLeadIds: Set<string>
}

export default function AttorneyDashboardLeadsTab({
  activePipelineTile,
  bulkActionLoading,
  bulkActionMessage,
  caseLeadsFilter,
  dashboardData,
  formatCurrency,
  onAcceptLead,
  onDeclineLead,
  onHandleQuickActionForLead,
  onOpenDocumentRequest,
  onOpenLead,
  onOpenLeadChat,
  onOpenScheduleConsult,
  pendingQuickAction,
  selectedLeadIds,
  setActivePipelineTile,
  setCaseLeadsFilter,
  setPendingQuickAction,
  setSelectedLeadIds,
  setStarredLeadIds,
  starredLeadIds,
}: AttorneyDashboardLeadsTabProps) {
  const claimLabel = (value: string) =>
    (value || '').replace(/_/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase())

  const isIdentityRevealed = (lead: any) => ['contacted', 'consulted', 'retained'].includes(lead?.status || '')

  const formatPhone = (value: string) => {
    if (!value) return ''
    const digits = value.replace(/\D/g, '').slice(-10)
    if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    return value
  }

  const getLeadBands = (lead: any) => {
    const pred = lead?.assessment?.predictions?.[0] || lead?.assessment?.predictions || {}
    let bands: any = {}
    if (pred?.bands) {
      try {
        bands = typeof pred.bands === 'string' ? JSON.parse(pred.bands) : pred.bands
      } catch {
        bands = {}
      }
    }
    return {
      low: bands.low ?? bands.p25 ?? 0,
      high: bands.high ?? bands.p75 ?? bands.median ?? 0,
    }
  }

  const getLeadEvidenceCount = (lead: any) =>
    lead?.assessment?.evidenceFiles?.length ?? lead?.assessment?.files?.length ?? 0

  const hasMadeContact = (lead: any) =>
    Boolean(
      lead?.lastContactAt ||
      (lead?.contactAttempts || []).some((attempt: any) => attempt?.completedAt || attempt?.createdAt),
    )

  const getLeadNextAction = (lead: any) => {
    const status = lead?.status || ''
    if (status === 'submitted') return 'Review and decide'
    if (status === 'contacted') return 'Schedule consult'
    if (status === 'consulted') return 'Send retainer'
    if (status === 'retained') return 'Open case workspace'
    return 'Review case'
  }

  const getPriorityLabel = (lead: any) => {
    const { high } = getLeadBands(lead)
    const evidenceCount = getLeadEvidenceCount(lead)
    if (lead?.hotnessLevel === 'high' || high >= 50000 || evidenceCount >= 4) {
      return { label: 'Hot', class: 'bg-red-100 text-red-700', icon: '!!' }
    }
    if (lead?.hotnessLevel === 'warm' || high >= 10000) {
      return { label: 'Warm', class: 'bg-amber-100 text-amber-700', icon: '!' }
    }
    return { label: 'Standard', class: 'bg-slate-100 text-slate-700', icon: '·' }
  }

  const getCaseStrengthBar = (score: number) => {
    const percent = Math.round((score || 0) * 100)
    const filled = Math.max(0, Math.min(10, Math.round(percent / 10)))
    return `${'█'.repeat(filled)}${'░'.repeat(10 - filled)}`
  }

  const getAttentionLabel = (lead: any) => {
    const status = lead?.status || ''
    if (status === 'submitted') return { label: 'Needs review', class: 'bg-amber-100 text-amber-800', icon: '!' }
    if (status === 'contacted') {
      return hasMadeContact(lead)
        ? { label: 'Schedule consult', class: 'bg-blue-100 text-blue-800', icon: '↺' }
        : { label: 'Make contact', class: 'bg-amber-100 text-amber-800', icon: '!' }
    }
    if (status === 'consulted') return { label: 'Send retainer', class: 'bg-emerald-100 text-emerald-800', icon: '$' }
    return { label: 'On track', class: 'bg-slate-100 text-slate-700', icon: '·' }
  }

  const getReadinessTone = (score: number) => {
    if (score >= 85) return 'bg-emerald-100 text-emerald-700'
    if (score >= 70) return 'bg-brand-100 text-brand-700'
    if (score >= 50) return 'bg-amber-100 text-amber-700'
    return 'bg-red-100 text-red-700'
  }

  const getCaseStatusLabel = (lead: any) => {
    const status = lead?.status || ''
    if (status === 'submitted') return 'Matched'
    if (status === 'contacted') return hasMadeContact(lead) ? 'Contacted' : 'Accepted'
    if (status === 'consulted') return 'Consult Scheduled'
    if (status === 'retained') return 'Retained'
    if (status === 'rejected') return 'Closed'
    return status || 'Unknown'
  }

  const getFlowStatus = (lead: any) => {
    const status = lead?.status || ''
    if (status === 'submitted') return { color: 'bg-brand-100 text-brand-700' }
    if (status === 'contacted') return { color: 'bg-blue-100 text-blue-700' }
    if (status === 'consulted') return { color: 'bg-amber-100 text-amber-700' }
    if (status === 'retained') return { color: 'bg-emerald-100 text-emerald-700' }
    if (status === 'rejected') return { color: 'bg-slate-100 text-slate-700' }
    return { color: 'bg-slate-100 text-slate-700' }
  }

  const getRelativeTime = (dateString: string) => {
    const timestamp = Date.parse(dateString)
    if (Number.isNaN(timestamp)) return ''
    const diffHours = Math.round((Date.now() - timestamp) / (1000 * 60 * 60))
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.round(diffHours / 24)}d ago`
  }

  const getRelationshipActivity = (lead: any) => {
    const contactAttempts = (lead?.contactAttempts || [])
      .map((attempt: any) => attempt?.completedAt || attempt?.createdAt)
      .filter(Boolean)
      .sort((a: string, b: string) => Date.parse(b) - Date.parse(a))
    const lastTouch = lead?.lastContactAt || contactAttempts[0] || ''
    const pendingDocRequests = lead?.documentRequests?.length ?? 0

    if (!isIdentityRevealed(lead)) {
      return {
        primary: 'Identity hidden',
        secondary: 'Accept to unlock contact info',
      }
    }

    if (lastTouch) {
      return {
        primary: `Last touch ${getRelativeTime(lastTouch)}`,
        secondary:
          pendingDocRequests > 0
            ? `${pendingDocRequests} doc request${pendingDocRequests === 1 ? '' : 's'} pending`
            : 'Relationship active',
      }
    }

    if (pendingDocRequests > 0) {
      return {
        primary: `${pendingDocRequests} doc request${pendingDocRequests === 1 ? '' : 's'} pending`,
        secondary: 'Awaiting plaintiff upload',
      }
    }

    return {
      primary: 'No contact yet',
      secondary: 'Call or message from the row actions',
    }
  }

  const getFilteredAndSortedLeads = () => {
    const filtered = (dashboardData?.recentLeads || []).filter((lead: any) => {
      if (caseLeadsFilter.routingInboxView === 'awaitingDecision' && (lead?.status || '') !== 'submitted') {
        return false
      }
      if (caseLeadsFilter.routingInboxView === 'hotMatches' && getPriorityLabel(lead).label !== 'Hot') {
        return false
      }
      if (caseLeadsFilter.routingInboxView === 'staleMatches') {
        const submittedAt = Date.parse(lead?.submittedAt || '')
        if (
          Number.isNaN(submittedAt) ||
          (lead?.status || '') !== 'submitted' ||
          (Date.now() - submittedAt) < (24 * 60 * 60 * 1000)
        ) {
          return false
        }
      }
      if (caseLeadsFilter.routingInboxView === 'consultReady' && ((lead?.status || '') !== 'contacted' || !hasMadeContact(lead))) {
        return false
      }

      if (
        caseLeadsFilter.caseType &&
        (lead.assessment?.claimType || '').toLowerCase() !== caseLeadsFilter.caseType.toLowerCase()
      ) {
        return false
      }

      if (caseLeadsFilter.pipelineStage) {
        const stage = caseLeadsFilter.pipelineStage
        const statusMap: Record<string, string[]> = {
          matched: ['submitted'],
          accepted: ['contacted'],
          contacted: ['contacted'],
          consultScheduled: ['consulted'],
          retained: ['retained'],
          closed: ['rejected'],
        }
        if (!(statusMap[stage] || []).includes(lead.status || '')) return false
      } else if (caseLeadsFilter.status && (lead.status || '') !== caseLeadsFilter.status) {
        return false
      }

      if (caseLeadsFilter.jurisdiction && (lead.assessment?.venueState || '') !== caseLeadsFilter.jurisdiction) {
        return false
      }

      const { high } = getLeadBands(lead)
      if (caseLeadsFilter.valueRange === 'low' && high >= 10000) return false
      if (caseLeadsFilter.valueRange === 'mid' && (high < 10000 || high >= 50000)) return false
      if (caseLeadsFilter.valueRange === 'high' && high < 50000) return false

      const evidenceCount = getLeadEvidenceCount(lead)
      if (caseLeadsFilter.evidenceLevel === 'none' && evidenceCount > 0) return false
      if (caseLeadsFilter.evidenceLevel === 'some' && (evidenceCount < 1 || evidenceCount >= 4)) return false
      if (caseLeadsFilter.evidenceLevel === 'full' && evidenceCount < 4) return false

      return true
    })

    return filtered.sort((a: any, b: any) => {
      const priorityOrder = { Hot: 0, Warm: 1, Standard: 2 }
      const priorityA = getPriorityLabel(a)
      const priorityB = getPriorityLabel(b)
      return (
        (priorityOrder[priorityA.label as keyof typeof priorityOrder] ?? 2) -
        (priorityOrder[priorityB.label as keyof typeof priorityOrder] ?? 2)
      )
    })
  }

  const filteredLeads = getFilteredAndSortedLeads()
  const routingInboxSummary = {
    awaitingDecision: (dashboardData?.recentLeads || []).filter((lead: any) => (lead?.status || '') === 'submitted').length,
    hotMatches: (dashboardData?.recentLeads || []).filter((lead: any) => getPriorityLabel(lead).label === 'Hot').length,
    staleMatches: (dashboardData?.recentLeads || []).filter((lead: any) => {
      const submittedAt = Date.parse(lead?.submittedAt || '')
      if (Number.isNaN(submittedAt)) return false
      return (lead?.status || '') === 'submitted' && (Date.now() - submittedAt) >= (24 * 60 * 60 * 1000)
    }).length,
    consultReady: (dashboardData?.recentLeads || []).filter((lead: any) => (lead?.status || '') === 'contacted' && hasMadeContact(lead)).length,
  }
  const applyRoutingInboxView = (
    view: NonNullable<CaseLeadsFilter['routingInboxView']>,
    filterPatch: Partial<CaseLeadsFilter>,
    pipelineTile: string | null,
  ) => {
    setCaseLeadsFilter({
      caseType: '',
      valueRange: '',
      status: '',
      pipelineStage: '',
      evidenceLevel: '',
      jurisdiction: '',
      routingInboxView: view,
      ...filterPatch,
    })
    setActivePipelineTile(pipelineTile)
    window.setTimeout(() => document.getElementById('cases-filters')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }
  const caseTypes = [
    ...new Set<string>(
      (dashboardData?.recentLeads || [])
        .map((lead: any) => lead.assessment?.claimType)
        .filter((value: unknown): value is string => Boolean(value)),
    ),
  ]
  const jurisdictions = [
    ...new Set<string>(
      (dashboardData?.recentLeads || [])
        .map((lead: any) => lead.assessment?.venueState)
        .filter((value: unknown): value is string => Boolean(value)),
    ),
  ]

  const toggleStarred = (id: string) => {
    setStarredLeadIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        localStorage.setItem('clearcaseiq_starred_leads', JSON.stringify([...next]))
      } catch {}
      return next
    })
  }

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelectedLeads = () => setSelectedLeadIds(new Set())

  const selectAllLeads = () => {
    setSelectedLeadIds(new Set(filteredLeads.map((lead: any) => lead.id)))
  }

  return (
    <div className="space-y-6">
      {pendingQuickAction && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-brand-800">Select a case: click the action button on any row below.</p>
          <button
            onClick={() => setPendingQuickAction(null)}
            className="text-sm text-brand-600 hover:text-brand-800 underline"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Routing inbox</p>
            <h3 className="text-lg font-semibold text-slate-900">Decision queue health</h3>
          </div>
          <p className="text-sm text-slate-500">Use this to spot which routed matters need attorney attention first.</p>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Awaiting decision</p>
            <button
              type="button"
              onClick={() => applyRoutingInboxView('awaitingDecision', { status: 'submitted', pipelineStage: 'matched' }, 'matched')}
              className="mt-1 text-2xl font-semibold text-amber-900 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            >
              {routingInboxSummary.awaitingDecision}
            </button>
            <p className="text-xs text-amber-700">Newly routed cases still waiting for accept or decline.</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-red-700">Hot matches</p>
            <button
              type="button"
              onClick={() => applyRoutingInboxView('hotMatches', {}, null)}
              className="mt-1 text-2xl font-semibold text-red-900 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              {routingInboxSummary.hotMatches}
            </button>
            <p className="text-xs text-red-700">High-value or evidence-rich matters that should move quickly.</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Aging over 24h</p>
            <button
              type="button"
              onClick={() => applyRoutingInboxView('staleMatches', { status: 'submitted', pipelineStage: 'matched' }, 'matched')}
              className="mt-1 text-2xl font-semibold text-blue-900 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {routingInboxSummary.staleMatches}
            </button>
            <p className="text-xs text-blue-700">Matched cases that may be slipping beyond the response commitment.</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Consult ready</p>
            <button
              type="button"
              onClick={() => applyRoutingInboxView('consultReady', { status: 'contacted', pipelineStage: 'contacted' }, 'contacted')}
              className="mt-1 text-2xl font-semibold text-emerald-900 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              {routingInboxSummary.consultReady}
            </button>
            <p className="text-xs text-emerald-700">Accepted cases with contact made and ready for consultation scheduling.</p>
          </div>
        </div>
      </div>

      <div id="cases-filters" className="card scroll-mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Filters:</span>
          <select
            value={caseLeadsFilter.caseType}
            onChange={(e) => setCaseLeadsFilter((prev) => ({ ...prev, caseType: e.target.value, routingInboxView: '' }))}
            className="text-sm border border-gray-200 rounded-md px-2 py-1"
          >
            <option value="">All Types</option>
            {caseTypes.map((type: string) => (
              <option key={type} value={type}>
                {claimLabel(type)}
              </option>
            ))}
          </select>
          <select
            value={caseLeadsFilter.valueRange}
            onChange={(e) => setCaseLeadsFilter((prev) => ({ ...prev, valueRange: e.target.value, routingInboxView: '' }))}
            className="text-sm border border-gray-200 rounded-md px-2 py-1"
          >
            <option value="">All Values</option>
            <option value="low">$0-$10K</option>
            <option value="mid">$10K-$50K</option>
            <option value="high">$50K+</option>
          </select>
          <select
            value={caseLeadsFilter.pipelineStage || caseLeadsFilter.status}
            onChange={(e) => {
              const value = e.target.value
              const statusMap: Record<string, string> = {
                matched: 'submitted',
                accepted: 'contacted',
                contacted: 'contacted',
                consultScheduled: 'consulted',
                retained: 'retained',
                closed: 'rejected',
              }
              setCaseLeadsFilter((prev) => ({ ...prev, pipelineStage: value, status: value ? statusMap[value] : '', routingInboxView: '' }))
              setActivePipelineTile(value || null)
            }}
            className="text-sm border border-gray-200 rounded-md px-2 py-1"
          >
            <option value="">All Stages</option>
            <option value="matched">Matched</option>
            <option value="accepted">Accepted</option>
            <option value="contacted">Contacted</option>
            <option value="consultScheduled">Consult Scheduled</option>
            <option value="retained">Retained</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={caseLeadsFilter.jurisdiction}
            onChange={(e) => setCaseLeadsFilter((prev) => ({ ...prev, jurisdiction: e.target.value, routingInboxView: '' }))}
            className="text-sm border border-gray-200 rounded-md px-2 py-1"
          >
            <option value="">All Jurisdictions</option>
            {jurisdictions.map((jurisdiction: string) => (
              <option key={jurisdiction} value={jurisdiction}>
                {jurisdiction}
              </option>
            ))}
          </select>
          <select
            value={caseLeadsFilter.evidenceLevel}
            onChange={(e) => setCaseLeadsFilter((prev) => ({ ...prev, evidenceLevel: e.target.value, routingInboxView: '' }))}
            className="text-sm border border-gray-200 rounded-md px-2 py-1"
          >
            <option value="">All Evidence</option>
            <option value="none">No Docs</option>
            <option value="some">1-3 Docs</option>
            <option value="full">4+ Docs</option>
          </select>
          <button
            onClick={() => {
              setCaseLeadsFilter({
                caseType: '',
                valueRange: '',
                status: '',
                pipelineStage: '',
                evidenceLevel: '',
                jurisdiction: '',
                routingInboxView: '',
              })
              setActivePipelineTile(null)
            }}
            className="text-xs text-brand-600 hover:underline"
          >
            Clear
          </button>
        </div>
      </div>

      {selectedLeadIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-brand-50 border border-brand-200">
          <span className="text-sm font-medium text-brand-800">{selectedLeadIds.size} selected</span>
          <button
            onClick={onOpenDocumentRequest}
            disabled={bulkActionLoading}
            className="text-sm text-brand-600 hover:underline disabled:opacity-50"
          >
            Send document request
          </button>
          <button
            onClick={onOpenScheduleConsult}
            disabled={bulkActionLoading || selectedLeadIds.size !== 1}
            title={selectedLeadIds.size !== 1 ? 'Select exactly 1 case to schedule consult' : ''}
            className="text-sm text-brand-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Schedule consult
          </button>
          {selectedLeadIds.size !== 1 && (
            <span className="text-xs text-gray-500">(Schedule consult: select 1 case)</span>
          )}
          <button
            onClick={clearSelectedLeads}
            disabled={bulkActionLoading}
            className="text-sm text-gray-600 hover:underline disabled:opacity-50"
          >
            Clear selection
          </button>
          {bulkActionMessage && <span className="text-sm text-brand-700">{bulkActionMessage}</span>}
        </div>
      )}

      {starredLeadIds.size > 0 && (
        <div className="card border-amber-200 bg-amber-50/30">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Starred Cases</h4>
          <p className="text-xs text-gray-500">Click the star on any row to save it here.</p>
        </div>
      )}

      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-medium text-gray-900">
            Cases {activePipelineTile ? `(${activePipelineTile})` : ''}
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={selectAllLeads} className="text-xs text-brand-600 hover:underline">
              Select all
            </button>
            <button onClick={clearSelectedLeads} className="text-xs text-gray-500 hover:underline">
              Clear
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case Strength</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evidence</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relationship</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attention</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Readiness / Next Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-6 py-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      {(dashboardData?.recentLeads?.length || 0) === 0 ? 'No leads yet' : 'No cases match your filters'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {(dashboardData?.recentLeads?.length || 0) === 0
                        ? 'Your dashboard will populate as leads are assigned based on your preferences.'
                        : 'Try adjusting filters or check back for new matches.'}
                    </p>
                    <p className="mt-4 text-sm text-gray-500">
                      <a href="/attorney-preferences" className="text-brand-600 hover:text-brand-500">
                        Configure preferences
                      </a>{' '}
                      to receive relevant cases.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead: any) => {
                  const bands = getLeadBands(lead)
                  const priority = getPriorityLabel(lead)
                  const attention = getAttentionLabel(lead)
                  const relationship = getRelationshipActivity(lead)
                  const evidenceCount = getLeadEvidenceCount(lead)
                  const strength = Math.round((lead.viabilityScore || 0) * 100)

                  return (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.has(lead.id)}
                          onChange={() => toggleSelectLead(lead.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleStarred(lead.id)} className="text-gray-400 hover:text-amber-500">
                          {starredLeadIds.has(lead.id) ? (
                            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                          ) : (
                            <Star className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${priority.class}`}>
                          {priority.icon} {priority.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isIdentityRevealed(lead) ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <LockOpen className="h-3.5 w-3.5 text-green-600 shrink-0" />
                              <span className="text-sm font-medium text-gray-900">
                                {[lead.assessment?.user?.firstName, lead.assessment?.user?.lastName].filter(Boolean).join(' ') || '—'}
                              </span>
                            </div>
                            {(lead.assessment?.user?.phone || lead.assessment?.user?.email) && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {lead.assessment?.user?.phone
                                  ? formatPhone(lead.assessment.user.phone)
                                  : lead.assessment?.user?.email}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5">
                              <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                              <span className="text-sm font-medium text-gray-900">
                                {claimLabel(lead.assessment?.claimType)} —{' '}
                                {[lead.assessment?.venueCounty, lead.assessment?.venueState].filter(Boolean).join(', ') || '—'}
                              </span>
                            </div>
                            <div className="text-xs text-amber-700 mt-0.5">Plaintiff identity hidden until accepted</div>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {[lead.assessment?.venueCounty, lead.assessment?.venueState].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {bands.low && bands.high ? `${formatCurrency(bands.low)}-${formatCurrency(bands.high)}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{strength}/100</div>
                        <div className="text-xs text-gray-500 font-mono">{getCaseStrengthBar(lead.viabilityScore)}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {evidenceCount > 0 ? `${evidenceCount} docs` : 'No docs'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getFlowStatus(lead).color}`}>
                          {getCaseStatusLabel(lead)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-800">{relationship.primary}</div>
                        <div className="text-xs text-gray-500">{relationship.secondary}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${attention.class}`}>
                          {attention.icon} {attention.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{getRelativeTime(lead.submittedAt || '')}</td>
                      <td className="px-4 py-3">
                        {lead.demandReadiness ? (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getReadinessTone(lead.demandReadiness.score)}`}>
                                {lead.demandReadiness.label}
                              </span>
                              <span className="text-xs text-gray-500">{lead.demandReadiness.score}%</span>
                              {lead.demandReadiness.overdueTaskCount > 0 ? (
                                <span className="text-xs text-red-600">{lead.demandReadiness.overdueTaskCount} overdue</span>
                              ) : null}
                            </div>
                            <div className="text-sm font-medium text-gray-800">{lead.demandReadiness.nextAction.title}</div>
                            {lead.demandReadiness.blockers?.[0] ? (
                              <div className="text-xs text-gray-500">{lead.demandReadiness.blockers[0].title}</div>
                            ) : (
                              <div className="text-xs text-gray-500">{getLeadNextAction(lead)}</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600">{getLeadNextAction(lead)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {pendingQuickAction ? (
                            <button
                              onClick={() =>
                                onHandleQuickActionForLead(lead, pendingQuickAction.action, pendingQuickAction.section)
                              }
                              className="px-2 py-1 text-xs font-medium text-brand-600 border border-brand-200 rounded hover:bg-brand-50"
                            >
                              {pendingQuickAction.action === 'scheduleConsult' && 'Schedule'}
                              {pendingQuickAction.action === 'documents' && 'Documents'}
                              {pendingQuickAction.action === 'documentRequest' && 'Request docs'}
                              {pendingQuickAction.action === 'draftMessage' && 'Message'}
                              {pendingQuickAction.section === 'communications' && 'Add contact'}
                              {pendingQuickAction.section === 'tasks' && 'Add task'}
                              {pendingQuickAction.section === 'demand' && 'Add note'}
                              {pendingQuickAction.section === 'insurance' && 'Add expense'}
                              {pendingQuickAction.section === 'billing' && 'Create invoice'}
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => onOpenLead(lead)}
                                className="px-2 py-1 text-xs font-medium text-brand-600 border border-brand-200 rounded hover:bg-brand-50"
                              >
                                Review
                              </button>
                              <button
                                onClick={() => onOpenLead(lead)}
                                className="px-2 py-1 text-xs font-medium text-gray-700 border border-gray-200 rounded hover:bg-gray-50 inline-flex items-center gap-1"
                              >
                                <Phone className="h-3 w-3" /> Call
                              </button>
                              <button
                                onClick={() => onOpenLeadChat(lead)}
                                className="px-2 py-1 text-xs font-medium text-gray-700 border border-gray-200 rounded hover:bg-gray-50 inline-flex items-center gap-1"
                              >
                                <MessageSquare className="h-3 w-3" /> Message
                              </button>
                              {(!lead.status || lead.status === 'submitted') && (
                                <>
                                  <button
                                    onClick={() => onAcceptLead(lead.id)}
                                    className="px-2 py-1 text-xs font-medium text-green-700 border border-green-200 rounded hover:bg-green-50"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => onDeclineLead(lead.id)}
                                    className="px-2 py-1 text-xs font-medium text-red-600 border border-red-200 rounded hover:bg-red-50"
                                  >
                                    Decline
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
