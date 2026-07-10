import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { Clock, Lock, LockOpen, MessageSquare, Phone, Sparkles, Star, Users } from 'lucide-react'
import { getAttorneyCaseStatusKey, caseStatusLabel, caseStatusColor } from '../lib/caseStatus'
import { getSeenMatchIds, markMatchSeen } from '../lib/seenMatches'
import { FilterStat, FilterBar, type FilterField } from '../features/shared/ui'

type CaseLeadsFilter = {
  caseType: string
  valueRange: string
  status: string
  pipelineStage: string
  evidenceLevel: string
  jurisdiction: string
  routingInboxView: 'newMatches' | 'awaitingDecision' | 'hotMatches' | 'staleMatches' | 'consultReady' | 'expired' | ''
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
  hideRoutingInbox?: boolean
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
  hideRoutingInbox,
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
  const [now, setNow] = useState(() => Date.now())
  const [showAllStarred, setShowAllStarred] = useState(false)
  // Which matches the attorney has already opened. Drives the New (unread) vs
  // Awaiting decision (opened, undecided) split in the routing inbox.
  const [seenMatchIds, setSeenMatchIds] = useState<Set<string>>(() => getSeenMatchIds())

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  // A submitted match the attorney hasn't opened yet = a brand-new/unread match.
  const isNewMatch = (lead: any) =>
    (lead?.status || '') === 'submitted' && !isExpiredMatch(lead) && !seenMatchIds.has(lead?.id)

  // Opening a match marks it read, so it moves from "New matches" to "Awaiting
  // decision" until the attorney accepts/declines.
  const handleOpenLead = (lead: any) => {
    if ((lead?.status || '') === 'submitted' && lead?.id) {
      setSeenMatchIds(markMatchSeen(lead.id))
    }
    onOpenLead(lead)
  }

  const claimLabel = (value: string) =>
    (value || '').replace(/_/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase())

  const formatCountdown = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000))
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const pad = (value: number) => String(value).padStart(2, '0')
    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
  }

  const getOfferCountdown = (lead: any) => {
    if ((lead?.status || '') !== 'submitted' || !lead?.offerExpiresAt) return null
    const expiresAt = new Date(lead.offerExpiresAt).getTime()
    if (Number.isNaN(expiresAt)) return null
    const remainingMs = expiresAt - now
    return {
      isExpired: remainingMs <= 0,
      label: formatCountdown(remainingMs),
    }
  }

  // A match is "expired/missed" once its response window lapses. The backend marks the
  // introduction EXPIRED (offerStatus), but we also derive it from offerExpiresAt so the
  // list updates the moment the clock runs out, before the next sweep runs.
  const isExpiredMatch = (lead: any) => {
    if ((lead?.offerStatus || '') === 'EXPIRED') return true
    if ((lead?.status || '') === 'submitted' && lead?.offerExpiresAt) {
      const t = Date.parse(lead.offerExpiresAt)
      return !Number.isNaN(t) && t <= now
    }
    return false
  }

  const isIdentityRevealed = (lead: any) => ['contacted', 'consulted', 'retained'].includes(lead?.status || '')

  const formatPhone = (value: string) => {
    if (!value) return ''
    const digits = value.replace(/\D/g, '').slice(-10)
    if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    return value
  }

  const getLeadBands = (lead: any) => {
    // Use the LATEST prediction (by createdAt) so this matches the pre-acceptance
    // snapshot, which also reads the latest. Reading predictions[0] (oldest) made
    // the list value disagree with the snapshot value (A3-09).
    const preds = lead?.assessment?.predictions
    const pred = Array.isArray(preds)
      ? [...preds].sort((a: any, b: any) => new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime()).pop()
      : preds || {}
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

  const getCaseStatusLabel = (lead: any) => caseStatusLabel(getAttorneyCaseStatusKey(lead))

  const getFlowStatus = (lead: any) => ({ color: caseStatusColor(getAttorneyCaseStatusKey(lead)) })

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
    // "New matches" = submitted matches the attorney hasn't opened yet (unread);
    // "Awaiting decision" = submitted matches they've opened but not decided on.
    // The read/unread split (seenMatchIds) keeps the two views strictly distinct
    // instead of both showing every submitted case (A3-25 / A3-56).
    const filtered = (dashboardData?.recentLeads || []).filter((lead: any) => {
      // Active Cases (Case Management) is the accepted caseload only. A case that
      // hasn't been accepted (still 'submitted', or 'rejected') never belongs here,
      // regardless of any other filter state.
      if (hideRoutingInbox && !['contacted', 'consulted', 'retained'].includes(lead?.status || '')) {
        return false
      }
      // Expired/missed matches are pulled out of every ordinary view (New Matches,
      // Awaiting decision, Hot, etc.) and only surface under the dedicated "Missed /
      // Expired" view, since the response window has closed and they've been released
      // to the next attorney.
      const expiredMatch = isExpiredMatch(lead)
      if (caseLeadsFilter.routingInboxView === 'expired') {
        return expiredMatch
      }
      if (expiredMatch) {
        return false
      }
      if (caseLeadsFilter.routingInboxView === 'newMatches') {
        // New matches = submitted matches the attorney hasn't opened yet (unread).
        if ((lead?.status || '') !== 'submitted' || seenMatchIds.has(lead?.id)) return false
      }
      if (caseLeadsFilter.routingInboxView === 'awaitingDecision') {
        // Awaiting decision = opened but not yet accepted/declined.
        if ((lead?.status || '') !== 'submitted' || !seenMatchIds.has(lead?.id)) return false
      }
      // "Hot Matches" filters by the canonical hotnessLevel === 'hot' (the same
      // signal the overview tile counts), not getPriorityLabel — which flags any
      // lead with >=4 evidence files or >=$50k as "Hot" and therefore matched
      // essentially every case, so the filter showed everything (A3-18).
      if (
        caseLeadsFilter.routingInboxView === 'hotMatches' &&
        ((lead?.hotnessLevel || '') !== 'hot' || (lead?.status || '') !== 'submitted')
      ) {
        // Hot matches are open, unaccepted matches only; an accepted case that happens
        // to be hot belongs to Active Cases, not the New Matches inbox.
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
          active: ['contacted', 'consulted', 'retained'],
          // "Accepted" = the whole accepted caseload, not just the contacted stage;
          // mapping it to only ['contacted'] made it silently drop consulted/retained
          // cases and behave identically to "Contacted".
          accepted: ['contacted', 'consulted', 'retained'],
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
  const starredLeads = (dashboardData?.recentLeads || []).filter((lead: any) => starredLeadIds.has(lead.id))

  // Post-acceptance bulk actions (document requests, scheduling a consult) only make
  // sense once a case is accepted. On the pre-acceptance "New Matches" list the leads
  // are still status "submitted" — selecting one should not surface case-management
  // actions the attorney hasn't unlocked by accepting.
  const selectedLeadsList = (dashboardData?.recentLeads || []).filter((lead: any) => selectedLeadIds.has(lead.id))
  const hasAcceptedSelection = selectedLeadsList.some((lead: any) =>
    ['contacted', 'consulted', 'retained'].includes(lead?.status || ''),
  )
  const routingInboxSummary = {
    // Expired/missed matches are counted only under their own tile, never under the
    // active tiles, so the tile numbers match the lists they open (an expired case is
    // no longer "hot" or "aging").
    hotMatches: (dashboardData?.recentLeads || []).filter((lead: any) => (lead?.hotnessLevel || '') === 'hot' && (lead?.status || '') === 'submitted' && !isExpiredMatch(lead)).length,
    staleMatches: (dashboardData?.recentLeads || []).filter((lead: any) => {
      if (isExpiredMatch(lead)) return false
      const submittedAt = Date.parse(lead?.submittedAt || '')
      if (Number.isNaN(submittedAt)) return false
      return (lead?.status || '') === 'submitted' && (Date.now() - submittedAt) >= (24 * 60 * 60 * 1000)
    }).length,
    consultReady: (dashboardData?.recentLeads || []).filter((lead: any) => (lead?.status || '') === 'contacted' && hasMadeContact(lead)).length,
    expired: (dashboardData?.recentLeads || []).filter((lead: any) => isExpiredMatch(lead)).length,
  }

  const newMatchesCount = (dashboardData?.recentLeads || []).filter((l: any) => isNewMatch(l)).length
  // Inbox value = combined upper-band estimate of the cases currently sitting in
  // "New matches", so the attorney can see how much potential value is waiting
  // for a decision at a glance.
  const inboxValue = (dashboardData?.recentLeads || [])
    .filter((l: any) => isNewMatch(l))
    .reduce((sum: number, l: any) => sum + (Number(getLeadBands(l).high) || 0), 0)
  const compactCurrency = (n: number) => {
    if (!n || n <= 0) return '$0'
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
    return formatCurrency(n)
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

  const leadsFilterFields: FilterField[] = [
    {
      key: 'caseType',
      label: 'Type',
      options: [{ value: '', label: 'All types' }, ...caseTypes.map((type) => ({ value: type, label: claimLabel(type) }))],
    },
    {
      key: 'valueRange',
      label: 'Value',
      options: [
        { value: '', label: 'All values' },
        { value: 'low', label: '$0–$10K' },
        { value: 'mid', label: '$10K–$50K' },
        { value: 'high', label: '$50K+' },
      ],
    },
    // The pipeline-stage filter is only meaningful for the accepted caseload
    // (contacted → consulted → retained). On the pre-acceptance "New Matches" inbox
    // every lead is still "submitted", so it's only offered when the routing inbox is
    // hidden (i.e. the accepted case-management view).
    ...(hideRoutingInbox
      ? [{
          key: 'pipelineStage',
          label: 'Stage',
          options: [
            { value: '', label: 'All stages' },
            { value: 'active', label: 'Active' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'contacted', label: 'Contacted' },
            { value: 'consultScheduled', label: 'Consultation scheduled' },
            { value: 'retained', label: 'Completed' },
            { value: 'closed', label: 'Closed' },
          ],
        } as FilterField]
      : []),
    {
      key: 'jurisdiction',
      label: 'Jurisdiction',
      options: [{ value: '', label: 'All jurisdictions' }, ...jurisdictions.map((j) => ({ value: j, label: j }))],
    },
    {
      key: 'evidenceLevel',
      label: 'Evidence',
      options: [
        { value: '', label: 'All evidence' },
        { value: 'none', label: 'No docs' },
        { value: 'some', label: '1–3 docs' },
        { value: 'full', label: '4+ docs' },
      ],
    },
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

      {hideRoutingInbox ? null : (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">New matches</p>
          <h3 className="text-lg font-semibold text-slate-900">Cases ready for review</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterStat
            value={newMatchesCount}
            label="New matches"
            tone="info"
            filled
            active={caseLeadsFilter.routingInboxView === 'newMatches'}
            onClick={() => applyRoutingInboxView('newMatches', {}, null)}
          />
          <FilterStat
            value={routingInboxSummary.hotMatches}
            label="Hot matches"
            tone="danger"
            filled
            active={caseLeadsFilter.routingInboxView === 'hotMatches'}
            onClick={() => applyRoutingInboxView('hotMatches', {}, null)}
          />
          <FilterStat
            value={routingInboxSummary.expired}
            label="Missed / expired"
            tone="neutral"
            filled
            active={caseLeadsFilter.routingInboxView === 'expired'}
            onClick={() => applyRoutingInboxView('expired', {}, null)}
          />
          <FilterStat value={compactCurrency(inboxValue)} label="Inbox value" tone="success" filled />
        </div>
      </div>
      )}

      <div id="cases-filters" className="scroll-mt-4">
        <FilterBar
          fields={leadsFilterFields}
          values={{
            caseType: caseLeadsFilter.caseType,
            valueRange: caseLeadsFilter.valueRange,
            pipelineStage: caseLeadsFilter.pipelineStage || caseLeadsFilter.status,
            jurisdiction: caseLeadsFilter.jurisdiction,
            evidenceLevel: caseLeadsFilter.evidenceLevel,
          }}
          onChange={(key, value) => {
            if (key === 'pipelineStage') {
              // The pipeline-stage filter is only meaningful for the accepted caseload
              // (contacted → consulted → retained); map the stage to a lead status.
              const statusMap: Record<string, string> = {
                matched: 'submitted',
                active: '',
                accepted: '',
                contacted: 'contacted',
                consultScheduled: 'consulted',
                retained: 'retained',
                closed: 'rejected',
              }
              setCaseLeadsFilter((prev) => ({ ...prev, pipelineStage: value, status: value ? statusMap[value] : '', routingInboxView: '' }))
              setActivePipelineTile(value || null)
              return
            }
            setCaseLeadsFilter((prev) => ({ ...prev, [key]: value, routingInboxView: '' }))
          }}
          onReset={() => {
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
        />
      </div>

      {selectedLeadIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-brand-50 border border-brand-200">
          <span className="text-sm font-medium text-brand-800">{selectedLeadIds.size} selected</span>
          {hasAcceptedSelection ? (
            <>
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
            </>
          ) : (
            <span className="text-xs text-gray-500">
              Accept a match to unlock document requests and consult scheduling.
            </span>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Starred Cases</h4>
              <p className="mt-1 text-xs text-gray-500">Quick access to cases you marked for follow-up.</p>
            </div>
            {starredLeads.length > 3 ? (
              <button
                type="button"
                onClick={() => setShowAllStarred((v) => !v)}
                className="text-xs font-semibold text-amber-700 hover:underline"
              >
                {showAllStarred ? 'Show fewer' : `View all ${starredLeads.length} starred cases`}
              </button>
            ) : (
              <span className="text-xs font-medium text-amber-700">
                Showing {starredLeads.length} starred {starredLeads.length === 1 ? 'case' : 'cases'}
              </span>
            )}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {(showAllStarred ? starredLeads : starredLeads.slice(0, 3)).map((lead: any) => (
              <button
                type="button"
                key={lead.id}
                onClick={() => handleOpenLead(lead)}
                className="rounded-lg border border-amber-100 bg-white px-3 py-2 text-left text-sm hover:border-amber-200"
              >
                <span className="block font-medium text-gray-900">
                  {claimLabel(lead.assessment?.claimType)} - {[lead.assessment?.venueCounty, lead.assessment?.venueState].filter(Boolean).join(', ') || 'Venue pending'}
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  {formatCurrency(getLeadBands(lead).low)}-{formatCurrency(getLeadBands(lead).high)} | {getPriorityLabel(lead).label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card min-w-0">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-medium text-gray-900">
            Cases {activePipelineTile ? `(${activePipelineTile})` : ''}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAllLeads}
              className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200 hover:bg-brand-100"
            >
              Select all
            </button>
            <button
              onClick={clearSelectedLeads}
              className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="w-full min-w-0 overflow-x-auto">
          <table className="w-full min-w-[1280px] table-fixed divide-y divide-slate-100">
            <colgroup>
              <col className="w-16" />
              <col className="w-10" />
              <col className="w-[220px]" />
              <col className="w-[90px]" />
              <col className="w-[110px]" />
              <col className="w-[130px]" />
              <col className="w-[145px]" />
              <col className="w-[135px]" />
              <col className="w-[95px]" />
              <col className="w-[140px]" />
              <col className="w-[230px]" />
            </colgroup>
            <thead className="bg-slate-50/60">
              <tr>
                <th className="w-16 px-3 py-3 text-left text-[11px] font-bold text-slate-700 uppercase tracking-wider">Lead</th>
                <th className="w-10 px-3 py-3 text-left text-[11px] font-bold text-slate-700 uppercase"></th>
                <th className="w-[230px] px-4 py-3 text-left text-[11px] font-bold text-slate-700 uppercase tracking-wider">Description</th>
                <th className="w-[90px] px-4 py-3 text-left text-[11px] font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                <th className="w-[105px] px-4 py-3 text-left text-[11px] font-bold text-slate-700 uppercase tracking-wider">Priority</th>
                <th className="w-[140px] px-4 py-3 text-left text-[11px] font-bold text-slate-700 uppercase tracking-wider">Location</th>
                <th className="w-[150px] px-4 py-3 text-left text-[11px] font-bold text-slate-700 uppercase tracking-wider">Est. Value</th>
                <th className="w-[135px] px-4 py-3 text-left text-[11px] font-bold text-slate-700 uppercase tracking-wider">Case Strength</th>
                <th className="w-[95px] px-4 py-3 text-left text-[11px] font-bold text-slate-700 uppercase tracking-wider">Evidence</th>
                <th className="w-[140px] px-4 py-3 text-left text-[11px] font-bold text-slate-700 uppercase tracking-wider">Status</th>
                <th className="w-[230px] px-4 py-3 text-left text-[11px] font-bold text-slate-700 uppercase tracking-wider">Readiness / Next Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center">
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
                filteredLeads.map((lead: any, index: number) => {
                  const bands = getLeadBands(lead)
                  const priority = getPriorityLabel(lead)
                  const evidenceCount = getLeadEvidenceCount(lead)
                  const rawStrength = Number(lead.viabilityScore || 0)
                  const strength = rawStrength <= 1 ? Math.round(rawStrength * 100) : Math.min(100, Math.round(rawStrength))
                  const offerCountdown = getOfferCountdown(lead)

                  return (
                    <tr key={lead.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-3 py-3 align-top">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold tabular-nums text-slate-400">{index + 1}</span>
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.has(lead.id)}
                            onChange={() => toggleSelectLead(lead.id)}
                            className="rounded border-gray-300"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <button onClick={() => toggleStarred(lead.id)} className="text-gray-400 hover:text-amber-500">
                          {starredLeadIds.has(lead.id) ? (
                            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                          ) : (
                            <Star className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {isIdentityRevealed(lead) ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <LockOpen className="h-3.5 w-3.5 text-green-600 shrink-0" />
                              <span className="text-sm font-medium text-gray-900 leading-snug">
                                {[lead.assessment?.user?.firstName, lead.assessment?.user?.lastName].filter(Boolean).join(' ') || '—'}
                              </span>
                            </div>
                            {(lead.assessment?.user?.phone || lead.assessment?.user?.email) && (
                              <div className="text-xs text-gray-500 mt-0.5 break-all">
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
                              <span className="text-sm font-medium text-gray-900 leading-snug">
                                {claimLabel(lead.assessment?.claimType)} —{' '}
                                {[lead.assessment?.venueCounty, lead.assessment?.venueState].filter(Boolean).join(', ') || '—'}
                              </span>
                            </div>
                            <div className="text-xs text-amber-700 mt-0.5">Plaintiff identity hidden until accepted</div>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex">
                          {pendingQuickAction ? (
                            <button
                              onClick={() =>
                                onHandleQuickActionForLead(lead, pendingQuickAction.action, pendingQuickAction.section)
                              }
                              className="inline-flex min-h-7 items-center justify-center whitespace-nowrap rounded border border-brand-200 px-3 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
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
                            <button
                              onClick={() => handleOpenLead(lead)}
                              className="inline-flex min-h-7 items-center justify-center whitespace-nowrap rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
                            >
                              Review
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${priority.class}`}>
                          {priority.icon} {priority.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-sm text-gray-600">
                        {[lead.assessment?.venueCounty, lead.assessment?.venueState].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3 align-top text-sm font-medium text-gray-900 whitespace-nowrap">
                        {bands.low && bands.high ? `${formatCurrency(bands.low)}-${formatCurrency(bands.high)}` : '—'}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {strength > 0 ? (
                          <>
                            <div className="text-sm font-medium">{strength}/100</div>
                            <div className="text-xs text-gray-500 font-mono">{getCaseStrengthBar(lead.viabilityScore)}</div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-400">Not scored</div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-sm text-gray-600">
                        {evidenceCount > 0 ? `${evidenceCount} docs` : 'No docs'}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getFlowStatus(lead).color}`}>
                            {getCaseStatusLabel(lead)}
                          </span>
                          {isNewMatch(lead) && (
                            <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                              <Sparkles className="h-3 w-3" />
                              New
                            </span>
                          )}
                        </div>
                        {offerCountdown && (
                          <div className={`mt-1 inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${
                            offerCountdown.isExpired
                              ? 'bg-red-50 text-red-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            <Clock className="h-3 w-3" />
                            {offerCountdown.isExpired ? 'Expired' : offerCountdown.label}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
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

