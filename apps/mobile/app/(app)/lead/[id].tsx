import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  getLeadDetails,
  decideLead,
  getApiErrorMessage,
  getLeadEvidenceFiles,
  getLeadQuality,
  getOrCreateAttorneyChatRoom,
  createLeadContact,
  createNegotiationEvent,
  createSolTask,
  getLeadCommandCenter,
  getLeadNegotiations,
  reviewLeadEvidenceFile,
  runConflictCheck,
  toAbsoluteApiUrl,
  updateLeadStatus,
  updatePlaintiffCaseStatus,
  type LeadEvidenceFile,
  type LeadQualityDetails,
  type NegotiationEvent,
} from '../../../src/lib/api'
import { InlineErrorBanner } from '../../../src/components/InlineErrorBanner'
import { ScreenState } from '../../../src/components/ScreenState'
import { useAttorneyDashboardData } from '../../../src/contexts/AttorneyDashboardContext'
import { navigateAttorneyQueueItem, type QueueActionType } from '../../../src/lib/attorneyQueueNav'
import { DECLINE_REASONS, type DeclineReasonCode } from '../../../src/constants/declineReasons'
import { colors, radii, space, shadows } from '../../../src/theme/tokens'
import { formatClaimType, formatLifecycleState, formatStatus, parseFacts } from '../../../src/lib/formatLead'

const PIPELINE_STATUSES = [
  { value: 'contacted', label: 'Contacted' },
  { value: 'consulted', label: 'Consulted' },
  { value: 'retained', label: 'Retained' },
] as const

const PLAINTIFF_STATUSES = [
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'SETTLED', label: 'Settled' },
  { value: 'CLOSED', label: 'Closed' },
] as const

const NEGOTIATION_TYPES = [
  { value: 'demand', label: 'Demand' },
  { value: 'offer', label: 'Offer' },
  { value: 'counter', label: 'Counter' },
  { value: 'note', label: 'Note' },
] as const

export default function LeadDetailScreen() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: dashboardData, refresh: refreshDashboard } = useAttorneyDashboardData()
  const hasFocusedOnceRef = useRef(false)
  const [lead, setLead] = useState<any>(null)
  const [evidenceFiles, setEvidenceFiles] = useState<LeadEvidenceFile[]>([])
  const [leadQuality, setLeadQuality] = useState<LeadQualityDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [deciding, setDeciding] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)
  const [acceptOpen, setAcceptOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState<DeclineReasonCode | ''>('')
  const [declineOther, setDeclineOther] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [decisionError, setDecisionError] = useState<string | null>(null)
  const [evidenceError, setEvidenceError] = useState<string | null>(null)
  const [declineValidation, setDeclineValidation] = useState<string | null>(null)
  const [decisionNotice, setDecisionNotice] = useState<{
    tone: 'success' | 'error'
    text: string
  } | null>(null)
  const [commandCenter, setCommandCenter] = useState<any>(null)
  const [negotiations, setNegotiations] = useState<NegotiationEvent[]>([])
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [plaintiffStatusOpen, setPlaintiffStatusOpen] = useState(false)
  const [plaintiffStatus, setPlaintiffStatus] = useState<(typeof PLAINTIFF_STATUSES)[number]['value']>('UNDER_REVIEW')
  const [plaintiffMessage, setPlaintiffMessage] = useState('')
  const [negotiationOpen, setNegotiationOpen] = useState(false)
  const [negotiationType, setNegotiationType] = useState<(typeof NEGOTIATION_TYPES)[number]['value']>('offer')
  const [negotiationAmount, setNegotiationAmount] = useState('')
  const [negotiationNotes, setNegotiationNotes] = useState('')

  const loadLead = useCallback(async () => {
    if (!id) return
    setLoadError(null)
    setEvidenceError(null)
    try {
      const [leadData, evidenceData] = await Promise.all([
        getLeadDetails(id),
        getLeadEvidenceFiles(id).catch((err: unknown) => {
          setEvidenceError(getApiErrorMessage(err))
          return []
        }),
      ])
      setLead(leadData)
      setEvidenceFiles(evidenceData)
      getLeadQuality(id)
        .then(setLeadQuality)
        .catch(() => setLeadQuality(null))
      getLeadCommandCenter(id)
        .then(setCommandCenter)
        .catch(() => setCommandCenter(null))
      getLeadNegotiations(id)
        .then(setNegotiations)
        .catch(() => setNegotiations([]))
    } catch (err: unknown) {
      setLead(null)
      setEvidenceFiles([])
      setLeadQuality(null)
      setCommandCenter(null)
      setNegotiations([])
      setLoadError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    hasFocusedOnceRef.current = false
    if (id) void loadLead()
  }, [id, loadLead])

  useFocusEffect(
    useCallback(() => {
      if (!id) return
      void refreshDashboard({ silent: true })
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true
        return
      }
      void loadLead()
    }, [id, loadLead, refreshDashboard])
  )

  const cachedLeadForCase = useMemo(() => {
    const leads = dashboardData?.recentLeads
    if (!Array.isArray(leads) || !id) return null
    return leads.find((l: { id?: string }) => l.id === id) ?? null
  }, [dashboardData, id])

  const missingAction = leadQuality?.missingItems?.find((item) => item?.actionType)
  const suggestedNext = (
    cachedLeadForCase?.demandReadiness?.nextAction ||
    lead?.demandReadiness?.nextAction ||
    leadQuality?.demandReadiness?.nextAction ||
    (missingAction
      ? {
          title: missingAction.label,
          detail: missingAction.detail,
          actionType: missingAction.actionType,
        }
      : undefined)
  ) as
    | { title?: string; detail?: string; actionType?: QueueActionType }
    | undefined

  const assessment = lead?.assessment || {}
  const facts = parseFacts(assessment.facts)
  const narrative =
    facts?.incident?.narrative && typeof facts.incident.narrative === 'string'
      ? facts.incident.narrative.slice(0, 420) + (facts.incident.narrative.length > 420 ? '…' : '')
      : null
  const plaintiff =
    assessment.user &&
    `${assessment.user.firstName || ''} ${assessment.user.lastName || ''}`.trim()
  const plaintiffPhone = assessment.user?.phone || null
  const plaintiffEmail = assessment.user?.email || null
  const checklistItems = Array.isArray(leadQuality?.evidenceChecklist?.required) ? leadQuality.evidenceChecklist.required : []
  const checklistUploaded = checklistItems.filter((item) => item?.uploaded).length
  const latestConflict = leadQuality?.conflicts?.find((item) => !item?.isResolved) || leadQuality?.conflicts?.[0]
  const solDays = Number(leadQuality?.sol?.daysUntilExpiration ?? leadQuality?.sol?.daysRemaining ?? NaN)
  const isSolUrgent = Boolean(leadQuality?.sol?.isUrgent) || (Number.isFinite(solDays) && solDays <= 90)
  const negotiationSummary = commandCenter?.negotiationSummary || {}
  const latestNegotiation = negotiations[0]
  const prediction = assessment.latestPrediction || {}
  const bands = prediction.bands || {}
  const settlementBands = bands.settlement || bands
  const trialBands = bands.trial || {}
  const settlementLow = Number(settlementBands.p25 ?? settlementBands.low ?? settlementBands.downside ?? 0)
  const settlementHigh = Number(settlementBands.p75 ?? settlementBands.high ?? settlementBands.upside ?? 0)
  const trialLow = Number(trialBands.p25 ?? (settlementHigh ? Math.round(settlementHigh * 1.35) : 0))
  const trialHigh = Number(trialBands.p75 ?? (settlementHigh ? Math.round(settlementHigh * 3.25) : 0))
  const viabilityBreakdown = leadQuality?.viabilityBreakdown || {}
  const viabilityPercent = normalizePercent(lead?.viabilityScore ?? viabilityBreakdown.overall ?? prediction.viability?.overall)
  const liabilityPercent = normalizePercent(lead?.liabilityScore ?? viabilityBreakdown.liability ?? prediction.viability?.liability)
  const severityPercent = normalizePercent(
    prediction.severity?.score ??
      (typeof prediction.severity?.level === 'number' ? prediction.severity.level / 4 : undefined) ??
      lead?.damagesScore ??
      viabilityBreakdown.damages
  )
  const caseCompletenessPercent = checklistItems.length
    ? Math.round((checklistUploaded / checklistItems.length) * 100)
    : Math.max(0, Math.min(100, Math.round(Number(leadQuality?.readinessScore || viabilityPercent || 0))))
  const attorneyAcceptancePercent = buildAcceptanceProbability({
    settlementLow,
    settlementHigh,
    liabilityPercent,
    severityPercent,
    completenessPercent: caseCompletenessPercent,
    evidenceCount: evidenceFiles.length || assessment.evidenceCount || 0,
  })
  const caseStrengthLabel = scoreLabel(viabilityPercent, 'Strong', 'Moderate', 'Needs work')
  const liabilityLabel = scoreLabel(liabilityPercent, 'Moderate-Strong', 'Mixed', 'Needs proof')
  const severityLabel = scoreLabel(severityPercent, 'Moderate-Severe', 'Moderate', 'Developing')
  const acceptanceLabel = scoreLabel(attorneyAcceptancePercent, 'Very Likely', 'Possible', 'Uncertain')
  const hasMriSignal = hasTextSignal(facts, leadQuality, ['mri', 'imaging'])
  const hasInjectionSignal = hasTextSignal(facts, leadQuality, ['injection', 'epidural'])
  const hasSurgerySignal = hasTextSignal(facts, leadQuality, ['surgery', 'fusion'])
  const hasTreatmentDurationSignal = Array.isArray(facts?.treatment) && facts.treatment.length >= 2

  const status = (lead?.status || '').toLowerCase()
  const lifecycleState = (lead?.lifecycleState || '').toLowerCase()
  const canDecide = status === 'submitted'
  const lifecycleLabel = formatLifecycleState(lead?.lifecycleState)
  const lifecycleHelp =
    lifecycleState === 'manual_review_needed'
      ? 'Routing moved to manual review. A coordinator may intervene before this case is sent back out.'
      : lifecycleState === 'plaintiff_info_requested'
        ? 'The plaintiff owes more information before this case can continue moving.'
        : lifecycleState === 'needs_more_info'
          ? 'More case information is needed before routing can proceed cleanly.'
          : lifecycleState === 'not_routable_yet'
            ? 'The case is not routable yet and may need stronger facts or documentation.'
            : lifecycleState === 'attorney_matched'
              ? 'This case is currently matched to an attorney and should be worked from the active pipeline.'
              : lifecycleState === 'engaged'
                ? 'The plaintiff has moved into an engaged matter stage.'
                : null

  function formatEvidenceCategory(category?: string | null) {
    if (!category) return 'Evidence'
    return category
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  function formatEvidenceMeta(file: LeadEvidenceFile) {
    const parts = [formatEvidenceCategory(file.category)]
    if (file.createdAt) {
      parts.push(new Date(file.createdAt).toLocaleDateString())
    }
    return parts.join(' · ')
  }

  async function openEvidenceFile(file: LeadEvidenceFile) {
    try {
      await Linking.openURL(toAbsoluteApiUrl(file.fileUrl))
    } catch (err: unknown) {
      setDecisionError(getApiErrorMessage(err))
    }
  }

  async function openExternal(url: string) {
    try {
      await Linking.openURL(url)
    } catch (err: unknown) {
      setDecisionError(getApiErrorMessage(err))
    }
  }

  async function openAndLogContact(type: 'call' | 'sms' | 'email', value: string) {
    if (!id) return
    const url = type === 'call' ? `tel:${value}` : type === 'sms' ? `sms:${value}` : `mailto:${value}`
    await openExternal(url)
    createLeadContact(id, {
      contactType: type,
      contactMethod: value,
      notes: `Quick ${type === 'sms' ? 'text' : type} action from mobile.`,
    }).catch(() => {})
  }

  async function openInAppChat() {
    const userId = assessment.userId || assessment.user?.id
    if (!userId) {
      setDecisionError('This case does not have a linked plaintiff account for in-app messaging yet.')
      return
    }
    try {
      const room = await getOrCreateAttorneyChatRoom({
        userId,
        assessmentId: assessment.id || lead?.assessmentId,
      })
      if (room.chatRoomId) {
        router.push(`/(app)/chat/${room.chatRoomId}`)
      }
    } catch (err: unknown) {
      setDecisionError(getApiErrorMessage(err))
    }
  }

  function showSuccess(text: string) {
    setDecisionNotice({ tone: 'success', text })
  }

  async function handleConflictCheck() {
    if (!id) return
    setActionBusy('conflict')
    setDecisionError(null)
    try {
      const result = await runConflictCheck(id)
      await getLeadQuality(id).then(setLeadQuality).catch(() => {})
      const risk = result?.details?.riskLevel || result?.conflictCheck?.riskLevel || 'clear'
      showSuccess(risk === 'high' ? 'Conflict check completed. Review required before accepting this case.' : 'Conflict check completed.')
    } catch (err: unknown) {
      setDecisionError(getApiErrorMessage(err))
    } finally {
      setActionBusy(null)
    }
  }

  async function handlePipelineStatus(value: 'contacted' | 'consulted' | 'retained') {
    if (!id) return
    setActionBusy(`pipeline:${value}`)
    setDecisionError(null)
    try {
      const updated = await updateLeadStatus(id, value)
      setLead((current: any) => (current ? { ...current, ...updated } : updated))
      await refreshDashboard({ force: true, silent: true })
      showSuccess(`Pipeline updated to ${formatStatus(value)}.`)
    } catch (err: unknown) {
      setDecisionError(getApiErrorMessage(err))
    } finally {
      setActionBusy(null)
    }
  }

  async function submitPlaintiffStatus() {
    if (!id) return
    setActionBusy('plaintiff-status')
    setDecisionError(null)
    try {
      await updatePlaintiffCaseStatus(id, {
        status: plaintiffStatus,
        message: plaintiffMessage.trim() || undefined,
      })
      setLead((current: any) => current ? { ...current, assessment: { ...current.assessment, status: plaintiffStatus } } : current)
      setPlaintiffStatusOpen(false)
      setPlaintiffMessage('')
      showSuccess('Plaintiff-facing case status was updated.')
    } catch (err: unknown) {
      setDecisionError(getApiErrorMessage(err))
    } finally {
      setActionBusy(null)
    }
  }

  async function submitNegotiation() {
    if (!id) return
    const amount = Number(negotiationAmount.replace(/[$,]/g, ''))
    setActionBusy('negotiation')
    setDecisionError(null)
    try {
      await createNegotiationEvent(id, {
        eventType: negotiationType,
        amount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
        notes: negotiationNotes.trim() || undefined,
      })
      const [events, center] = await Promise.all([
        getLeadNegotiations(id).catch(() => []),
        getLeadCommandCenter(id).catch(() => null),
      ])
      setNegotiations(events)
      setCommandCenter(center)
      setNegotiationOpen(false)
      setNegotiationAmount('')
      setNegotiationNotes('')
      showSuccess('Settlement tracker updated.')
    } catch (err: unknown) {
      setDecisionError(getApiErrorMessage(err))
    } finally {
      setActionBusy(null)
    }
  }

  async function handleSolTask() {
    if (!id) return
    setActionBusy('sol')
    setDecisionError(null)
    try {
      await createSolTask(id)
      await refreshDashboard({ force: true, silent: true })
      showSuccess('SOL alert task created.')
    } catch (err: unknown) {
      setDecisionError(getApiErrorMessage(err))
    } finally {
      setActionBusy(null)
    }
  }

  async function handleReviewEvidence(file: LeadEvidenceFile, status: 'reviewed' | 'needs_follow_up') {
    if (!id) return
    setActionBusy(`review:${file.id}`)
    setDecisionError(null)
    try {
      const updated = await reviewLeadEvidenceFile(id, file.id, {
        status,
        content: status === 'reviewed' ? 'Reviewed from mobile.' : 'Needs attorney follow-up from mobile review.',
      })
      setEvidenceFiles((current) => current.map((item) => item.id === file.id ? { ...item, ...updated } : item))
      showSuccess(status === 'reviewed' ? 'Document marked reviewed.' : 'Document flagged for follow-up.')
    } catch (err: unknown) {
      setDecisionError(getApiErrorMessage(err))
    } finally {
      setActionBusy(null)
    }
  }

  async function handleAccept() {
    if (!id) return
    setDeciding(true)
    setDecisionError(null)
    setDecisionNotice(null)
    try {
      await decideLead(id, 'accept')
      await refreshDashboard({ force: true, silent: true })
      setLead((current: any) => (current ? { ...current, status: 'ACCEPTED', lifecycleState: 'attorney_matched' } : current))
      setAcceptOpen(false)
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch { /* no-op */ }
      setDecisionNotice({
        tone: 'success',
        text: 'Case accepted. The plaintiff will be notified and this case will move into your active pipeline.',
      })
    } catch (err: unknown) {
      setDecisionError(getApiErrorMessage(err))
    } finally {
      setDeciding(false)
    }
  }

  async function submitDecline() {
    if (!id || !declineReason) return
    if (declineReason === 'other' && !declineOther.trim()) {
      setDeclineValidation('Please briefly describe why you are declining.')
      return
    }
    setDeciding(true)
    setDecisionError(null)
    setDecisionNotice(null)
    setDeclineValidation(null)
    try {
      await decideLead(id, 'reject', declineOther || undefined, declineReason)
      await refreshDashboard({ force: true, silent: true })
      setLead((current: any) => (current ? { ...current, status: 'DECLINED', lifecycleState: 'routing_active' } : current))
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      } catch { /* no-op */ }
      setDeclineOpen(false)
      setDeclineReason('')
      setDeclineOther('')
      setDecisionNotice({
        tone: 'success',
        text: 'Case declined. Thanks for leaving feedback to improve future routing.',
      })
    } catch (err: unknown) {
      setDecisionError(getApiErrorMessage(err))
    } finally {
      setDeciding(false)
    }
  }

  if (loading) {
    return <ScreenState title="Loading case" message="Fetching the latest case details." loading />
  }

  if (!lead) {
    return (
      <ScreenState
        icon="alert-circle-outline"
        title="Unable to open this case"
        message={loadError || 'Case not found or access denied.'}
        actionLabel="Try again"
        onAction={() => {
          setLoading(true)
          loadLead()
        }}
      />
    )
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollPad, { paddingBottom: 120 + insets.bottom }]}
      >
        <View style={styles.hero}>
          {plaintiff ? <Text style={styles.heroPlaintiff}>{plaintiff}</Text> : null}
          <Text style={styles.heroType}>{formatClaimType(assessment.claimType)}</Text>
          <Text style={styles.heroStatus}>{formatStatus(lead.status)}</Text>
          {lifecycleLabel ? <Text style={styles.heroLifecycle}>{lifecycleLabel}</Text> : null}
        </View>

        {suggestedNext?.title ? (
          <TouchableOpacity
            style={styles.nextStepCard}
            onPress={() =>
              id &&
              (suggestedNext.actionType === 'request_documents'
                ? router.push({ pathname: '/(app)/request-docs', params: { leadId: id } })
                : navigateAttorneyQueueItem({
                    actionType: (suggestedNext.actionType || 'open_lead') as QueueActionType,
                    leadId: id,
                  }))
            }
            activeOpacity={0.88}
          >
            <View style={styles.nextStepHeader}>
              <Ionicons name="navigate-circle-outline" size={22} color={colors.brandAccent} />
              <Text style={styles.nextStepLabel}>Suggested next step</Text>
            </View>
            <Text style={styles.nextStepTitle}>{suggestedNext.title}</Text>
            {suggestedNext.detail ? <Text style={styles.nextStepDetail}>{suggestedNext.detail}</Text> : null}
            <Text style={styles.nextStepCta}>Go →</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.quickLinks}>
          <TouchableOpacity style={styles.quickLink} onPress={() => { void openInAppChat() }} activeOpacity={0.85}>
            <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
            <Text style={styles.quickLinkText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => id && router.push({ pathname: '/(app)/schedule-consult', params: { leadId: id } })}
            activeOpacity={0.85}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={styles.quickLinkText}>Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/(app)/tasks')} activeOpacity={0.85}>
            <Ionicons name="checkbox-outline" size={18} color={colors.primary} />
            <Text style={styles.quickLinkText}>Tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => id && router.push({ pathname: '/(app)/request-docs', params: { leadId: id } })}
            activeOpacity={0.85}
          >
            <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
            <Text style={styles.quickLinkText}>Doc requests</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => id && router.push({ pathname: '/(app)/contacts', params: { leadId: id } })}
            activeOpacity={0.85}
          >
            <Ionicons name="people-outline" size={18} color={colors.primary} />
            <Text style={styles.quickLinkText}>Contacts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => id && router.push({ pathname: '/(app)/notes', params: { leadId: id } })}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={styles.quickLinkText}>Notes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => id && router.push({ pathname: '/(app)/billing', params: { leadId: id } })}
            activeOpacity={0.85}
          >
            <Ionicons name="card-outline" size={18} color={colors.primary} />
            <Text style={styles.quickLinkText}>Billing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => id && router.push({ pathname: '/(app)/files', params: { leadId: id } })}
            activeOpacity={0.85}
          >
            <Ionicons name="folder-outline" size={18} color={colors.primary} />
            <Text style={styles.quickLinkText}>Files</Text>
          </TouchableOpacity>
        </View>

        {decisionNotice ? (
          <View
            style={[
              styles.noticeBanner,
              decisionNotice.tone === 'success' ? styles.noticeSuccess : styles.noticeError,
            ]}
          >
            <View style={styles.noticeCopy}>
              <Ionicons
                name={decisionNotice.tone === 'success' ? 'checkmark-circle-outline' : 'warning-outline'}
                size={18}
                color={decisionNotice.tone === 'success' ? colors.success : colors.danger}
              />
              <Text style={styles.noticeText}>{decisionNotice.text}</Text>
            </View>
            <View style={styles.noticeActions}>
              <TouchableOpacity onPress={() => setDecisionNotice(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.noticeAction}>Dismiss</Text>
              </TouchableOpacity>
              {decisionNotice.tone === 'success' ? (
                <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.noticeAction}>Back</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}
        {decisionError ? <InlineErrorBanner message={decisionError} onAction={() => setDecisionError(null)} actionLabel="Dismiss" /> : null}

        <View style={styles.card}>
          <Row icon="location-outline" label="Venue" value={[assessment.venueCounty, assessment.venueState].filter(Boolean).join(', ') || '—'} />
          {plaintiff ? <Row icon="person-outline" label="Plaintiff" value={plaintiff} /> : null}
          {plaintiffPhone || plaintiffEmail ? (
            <View style={styles.contactActionRow}>
              {plaintiffPhone ? (
                <>
                  <TouchableOpacity style={styles.contactActionBtn} onPress={() => { void openAndLogContact('call', plaintiffPhone) }}>
                    <Ionicons name="call-outline" size={16} color={colors.primary} />
                    <Text style={styles.contactActionText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.contactActionBtn} onPress={() => { void openAndLogContact('sms', plaintiffPhone) }}>
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
                    <Text style={styles.contactActionText}>Text</Text>
                  </TouchableOpacity>
                </>
              ) : null}
              {plaintiffEmail ? (
                <TouchableOpacity style={styles.contactActionBtn} onPress={() => { void openAndLogContact('email', plaintiffEmail) }}>
                  <Ionicons name="mail-outline" size={16} color={colors.primary} />
                  <Text style={styles.contactActionText}>Email</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
          {lifecycleLabel ? <Row icon="git-branch-outline" label="Routing stage" value={lifecycleLabel} /> : null}
          {assessment.evidenceCount != null ? (
            <Row icon="document-text-outline" label="Evidence files" value={String(assessment.evidenceCount)} />
          ) : null}
          {lead.viabilityScore != null && (
            <Row
              icon="analytics-outline"
              label="Viability score"
              value={
                lead.viabilityScore <= 1
                  ? `${Math.round(lead.viabilityScore * 100)}%`
                  : `${Math.round(lead.viabilityScore)}%`
              }
            />
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Case Snapshot</Text>
            <Text style={styles.sectionCount}>{acceptanceLabel}</Text>
          </View>
          <Text style={styles.qualitySummary}>
            Mobile attorney review now weighs case strength, liability, severity, economics, likely case cost, documents, and insurance recovery.
          </Text>
          <View style={styles.snapshotGrid}>
            <SnapshotMetric label="Case Strength" value={`${viabilityPercent}/100`} helper={caseStrengthLabel} />
            <SnapshotMetric label="Liability" value={`${liabilityPercent}%`} helper={liabilityLabel} />
            <SnapshotMetric label="Injury Severity" value={`${severityPercent}%`} helper={severityLabel} />
            <SnapshotMetric label="Settlement Value" value={formatRange(settlementLow, settlementHigh)} helper="Modeled range" />
            <SnapshotMetric label="Trial Value" value={formatRange(trialLow, trialHigh)} helper="Litigation exposure" />
            <SnapshotMetric label="Attorney Acceptance" value={`${attorneyAcceptancePercent}%`} helper={acceptanceLabel} accent />
          </View>
          <View style={styles.completenessCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.snapshotLabel}>Case Completeness</Text>
              <Text style={styles.completenessValue}>{caseCompletenessPercent}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${caseCompletenessPercent}%` }]} />
            </View>
          </View>
          <View style={styles.signalBlock}>
            <Text style={styles.signalTitle}>Severity factors</Text>
            <FactorRow label="MRI findings" present={hasMriSignal} />
            <FactorRow label="Treatment duration" present={hasTreatmentDurationSignal} />
            <FactorRow label="Injections" present={hasInjectionSignal} />
            <FactorRow label="Surgery" present={hasSurgerySignal} />
          </View>
          {leadQuality?.recommendation?.rationale ? (
            <Text style={[styles.qualitySummary, styles.snapshotRationale]}>{leadQuality.recommendation.rationale}</Text>
          ) : null}
          {Array.isArray(leadQuality?.strengths) && leadQuality.strengths.length > 0 ? (
            <View style={styles.signalBlock}>
              <Text style={styles.signalTitle}>Why attorneys may like it</Text>
              {leadQuality.strengths.slice(0, 3).map((item) => (
                <Text key={item} style={styles.signalText}>✓ {item}</Text>
              ))}
            </View>
          ) : null}
          {Array.isArray(leadQuality?.risks) && leadQuality.risks.length > 0 ? (
            <View style={styles.signalBlock}>
              <Text style={styles.signalTitle}>Watch items</Text>
              {leadQuality.risks.slice(0, 3).map((item) => (
                <Text key={item} style={styles.signalText}>• {item}</Text>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Conflict check</Text>
            <Text style={[styles.badgeText, latestConflict?.riskLevel === 'high' && styles.badgeDanger]}>
              {latestConflict ? `${latestConflict.riskLevel || 'review'} risk` : 'Not run'}
            </Text>
          </View>
          <Text style={styles.qualitySummary}>
            {latestConflict
              ? `Latest result: ${latestConflict.conflictType || 'conflict'}${latestConflict.isResolved ? ' · resolved' : ''}.`
              : 'Run a quick conflict screen before moving deeper into representation.'}
          </Text>
          <TouchableOpacity style={styles.inlineAction} onPress={handleConflictCheck} disabled={actionBusy === 'conflict'} activeOpacity={0.85}>
            {actionBusy === 'conflict' ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.inlineActionText}>Run conflict check</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Case status updates</Text>
          <Text style={styles.qualitySummary}>Update your internal pipeline or send a plaintiff-facing stage update.</Text>
          <View style={styles.chipRow}>
            {PIPELINE_STATUSES.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[styles.statusChip, lead.status?.toLowerCase() === item.value && styles.statusChipOn]}
                onPress={() => { void handlePipelineStatus(item.value) }}
                disabled={Boolean(actionBusy)}
                activeOpacity={0.85}
              >
                <Text style={[styles.statusChipText, lead.status?.toLowerCase() === item.value && styles.statusChipTextOn]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.inlineAction} onPress={() => setPlaintiffStatusOpen(true)} activeOpacity={0.85}>
            <Text style={styles.inlineActionText}>Update plaintiff status</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Document review checklist</Text>
            <Text style={styles.sectionCount}>{checklistItems.length ? `${checklistUploaded}/${checklistItems.length}` : `${evidenceFiles.filter((file) => file.isVerified).length}/${evidenceFiles.length}`}</Text>
          </View>
          {checklistItems.length > 0 ? (
            checklistItems.slice(0, 5).map((item) => (
              <View key={`${item.name || item.label}`} style={styles.checkRow}>
                <Ionicons name={item.uploaded ? 'checkmark-circle-outline' : 'ellipse-outline'} size={18} color={item.uploaded ? colors.success : colors.muted} />
                <Text style={styles.checkText}>{item.name || item.label || 'Document'}</Text>
                {item.critical ? <Text style={styles.criticalText}>Critical</Text> : null}
              </View>
            ))
          ) : (
            <Text style={styles.emptyEvidenceText}>Open files below and mark reviewed as you finish the document pass.</Text>
          )}
          <TouchableOpacity style={styles.inlineAction} onPress={() => id && router.push({ pathname: '/(app)/request-docs', params: { leadId: id } })} activeOpacity={0.85}>
            <Text style={styles.inlineActionText}>Request missing documents</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Settlement tracker</Text>
            <Text style={styles.sectionCount}>{negotiations.length}</Text>
          </View>
          <Row icon="trending-up-outline" label="Latest demand" value={formatMoney(negotiationSummary.latestDemand ?? negotiationSummary.latest?.demand)} />
          <Row icon="cash-outline" label="Latest offer" value={formatMoney(negotiationSummary.latestOffer ?? negotiationSummary.latest?.offer)} />
          {latestNegotiation ? <Text style={styles.signalText}>Last logged: {formatNegotiationType(latestNegotiation.eventType)} {latestNegotiation.amount ? `· ${formatMoney(latestNegotiation.amount)}` : ''}</Text> : null}
          {negotiationSummary.recommendedMove || negotiationSummary.nextMove ? (
            <Text style={styles.qualitySummary}>{negotiationSummary.recommendedMove || negotiationSummary.nextMove}</Text>
          ) : null}
          <TouchableOpacity style={styles.inlineAction} onPress={() => setNegotiationOpen(true)} activeOpacity={0.85}>
            <Text style={styles.inlineActionText}>Log offer / demand</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, isSolUrgent && styles.warningCard]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Statute of limitations alert</Text>
            <Text style={[styles.badgeText, isSolUrgent && styles.badgeDanger]}>{Number.isFinite(solDays) ? `${solDays} days` : 'Check'}</Text>
          </View>
          <Text style={styles.qualitySummary}>
            {isSolUrgent
              ? 'SOL timing needs immediate task tracking.'
              : 'Create a deadline task so the SOL stays visible in the attorney workflow.'}
          </Text>
          <TouchableOpacity style={styles.inlineAction} onPress={handleSolTask} disabled={actionBusy === 'sol'} activeOpacity={0.85}>
            {actionBusy === 'sol' ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.inlineActionText}>Create SOL task</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Evidence files</Text>
            <Text style={styles.sectionCount}>{evidenceFiles.length}</Text>
          </View>
          {evidenceError ? (
            <InlineErrorBanner message={evidenceError} onAction={() => { setLoading(true); loadLead() }} />
          ) : evidenceFiles.length === 0 ? (
            <Text style={styles.emptyEvidenceText}>No evidence files are attached to this case yet.</Text>
          ) : (
            evidenceFiles.map((file) => (
              <View key={file.id} style={styles.fileReviewBlock}>
                <TouchableOpacity
                  style={styles.fileRow}
                  onPress={() => {
                    void openEvidenceFile(file)
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.fileIconWrap}>
                    <Ionicons name={file.isVerified ? 'checkmark-done-outline' : 'document-attach-outline'} size={20} color={file.isVerified ? colors.success : colors.primary} />
                  </View>
                  <View style={styles.fileBody}>
                    <Text style={styles.fileName}>{file.originalName || file.filename}</Text>
                    <Text style={styles.fileMeta}>{formatEvidenceMeta(file)}{file.isVerified ? ' · Reviewed' : ''}</Text>
                  </View>
                  <Ionicons name="open-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
                <View style={styles.fileReviewActions}>
                  <TouchableOpacity style={styles.reviewButton} onPress={() => { void handleReviewEvidence(file, 'reviewed') }} disabled={actionBusy === `review:${file.id}`}>
                    <Text style={styles.reviewButtonText}>Mark reviewed</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.reviewButton, styles.reviewButtonWarn]} onPress={() => { void handleReviewEvidence(file, 'needs_follow_up') }} disabled={actionBusy === `review:${file.id}`}>
                    <Text style={styles.reviewButtonText}>Needs follow-up</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {narrative ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Summary</Text>
            <Text style={styles.narrative}>{narrative}</Text>
          </View>
        ) : null}

        {!canDecide && (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.infoBannerText}>
              {lifecycleHelp || `Decisions can be recorded while status is "Needs review". This case is already ${formatStatus(lead.status)}.`}
            </Text>
          </View>
        )}
      </ScrollView>

      {canDecide && (
        <View style={[styles.footerActions, { paddingBottom: space.lg + insets.bottom }]}>
          <TouchableOpacity
            style={[styles.cta, styles.ctaSecondary]}
            onPress={() => {
              setDecisionError(null)
              setDecisionNotice(null)
              setDeclineReason('')
              setDeclineOther('')
              setDeclineValidation(null)
              setDeclineOpen(true)
            }}
            disabled={deciding}
          >
            <Text style={styles.ctaSecondaryText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cta, styles.ctaPrimary]}
            onPress={() => {
              setDecisionError(null)
              setDecisionNotice(null)
              setAcceptOpen(true)
            }}
            disabled={deciding}
          >
            {deciding && !declineOpen ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaPrimaryText}>Accept case</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={acceptOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Accept case</Text>
            <Text style={styles.modalSub}>
              You will be assigned as the reviewing attorney and the plaintiff will be notified.
            </Text>
            <View style={styles.acceptCard}>
              <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
              <Text style={styles.acceptCardText}>
                Accepting removes this case from the needs-review queue and moves it into your active pipeline.
              </Text>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setAcceptOpen(false)} disabled={deciding}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalAccept, deciding && styles.modalSubmitDisabled]} onPress={handleAccept} disabled={deciding}>
                {deciding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Accept case</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={declineOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Decline case</Text>
            <Text style={styles.modalSub}>Optional but helps route better matches later.</Text>
            <ScrollView style={styles.reasonList} keyboardShouldPersistTaps="handled">
              {DECLINE_REASONS.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.reasonRow, declineReason === r.value && styles.reasonRowOn]}
                  onPress={() => {
                    setDeclineReason(r.value)
                    setDeclineValidation(null)
                    if (r.value !== 'other') {
                      setDeclineOther('')
                    }
                  }}
                >
                  <Ionicons
                    name={declineReason === r.value ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={declineReason === r.value ? colors.primary : colors.muted}
                  />
                  <Text style={[styles.reasonLabel, declineReason === r.value && styles.reasonLabelOn]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {declineReason === 'other' && (
              <TextInput
                style={styles.otherInput}
                placeholder="Brief explanation"
                placeholderTextColor={colors.muted}
                value={declineOther}
                onChangeText={(value) => {
                  setDeclineOther(value)
                  if (value.trim()) {
                    setDeclineValidation(null)
                  }
                }}
                multiline
              />
            )}
            {declineValidation ? (
              <View style={styles.validationBanner}>
                <Ionicons name="warning-outline" size={18} color={colors.warning} />
                <Text style={styles.validationText}>{declineValidation}</Text>
              </View>
            ) : null}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setDeclineOpen(false)
                  setDeclineValidation(null)
                }}
                disabled={deciding}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, !declineReason && styles.modalSubmitDisabled]}
                onPress={submitDecline}
                disabled={!declineReason || deciding}
              >
                {deciding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit decline</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={plaintiffStatusOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Update plaintiff status</Text>
            <Text style={styles.modalSub}>This changes the stage the plaintiff sees in their case tracker.</Text>
            <View style={styles.chipRow}>
              {PLAINTIFF_STATUSES.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.statusChip, plaintiffStatus === item.value && styles.statusChipOn]}
                  onPress={() => setPlaintiffStatus(item.value)}
                >
                  <Text style={[styles.statusChipText, plaintiffStatus === item.value && styles.statusChipTextOn]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.otherInput}
              placeholder="Optional plaintiff update message"
              placeholderTextColor={colors.muted}
              value={plaintiffMessage}
              onChangeText={setPlaintiffMessage}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setPlaintiffStatusOpen(false)} disabled={actionBusy === 'plaintiff-status'}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalAccept, actionBusy === 'plaintiff-status' && styles.modalSubmitDisabled]} onPress={submitPlaintiffStatus} disabled={actionBusy === 'plaintiff-status'}>
                {actionBusy === 'plaintiff-status' ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={negotiationOpen} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Log settlement activity</Text>
            <Text style={styles.modalSub}>Track demands, offers, counters, and negotiation notes from mobile.</Text>
            <View style={styles.chipRow}>
              {NEGOTIATION_TYPES.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.statusChip, negotiationType === item.value && styles.statusChipOn]}
                  onPress={() => setNegotiationType(item.value)}
                >
                  <Text style={[styles.statusChipText, negotiationType === item.value && styles.statusChipTextOn]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.singleInput}
              placeholder="Amount (optional)"
              placeholderTextColor={colors.muted}
              value={negotiationAmount}
              onChangeText={setNegotiationAmount}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.otherInput}
              placeholder="Notes"
              placeholderTextColor={colors.muted}
              value={negotiationNotes}
              onChangeText={setNegotiationNotes}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setNegotiationOpen(false)} disabled={actionBusy === 'negotiation'}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalAccept, actionBusy === 'negotiation' && styles.modalSubmitDisabled]} onPress={submitNegotiation} disabled={actionBusy === 'negotiation'}>
                {actionBusy === 'negotiation' ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Log</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={colors.textSecondary} style={styles.rowIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  )
}

function SnapshotMetric({ label, value, helper, accent }: { label: string; value: string; helper: string; accent?: boolean }) {
  return (
    <View style={[styles.snapshotMetric, accent && styles.snapshotMetricAccent]}>
      <Text style={styles.snapshotLabel}>{label}</Text>
      <Text style={[styles.snapshotValue, accent && styles.snapshotValueAccent]}>{value}</Text>
      <Text style={styles.snapshotHelper}>{helper}</Text>
    </View>
  )
}

function FactorRow({ label, present }: { label: string; present: boolean }) {
  return (
    <View style={styles.factorRow}>
      <Ionicons
        name={present ? 'checkmark-circle-outline' : 'close-circle-outline'}
        size={16}
        color={present ? colors.success : colors.muted}
      />
      <Text style={styles.factorText}>{label}</Text>
    </View>
  )
}

function formatMoney(value: unknown) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return '—'
  return `$${Math.round(amount).toLocaleString()}`
}

function formatRange(low: unknown, high: unknown) {
  const lowAmount = Number(low)
  const highAmount = Number(high)
  if (!Number.isFinite(lowAmount) || !Number.isFinite(highAmount) || lowAmount <= 0 || highAmount <= 0) return '—'
  return `${formatMoney(lowAmount)} - ${formatMoney(Math.max(lowAmount, highAmount))}`
}

function normalizePercent(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return 0
  return Math.max(0, Math.min(100, Math.round(numeric <= 1 ? numeric * 100 : numeric)))
}

function scoreLabel(score: number, high: string, medium: string, low: string) {
  if (score >= 75) return high
  if (score >= 45) return medium
  return low
}

function buildAcceptanceProbability(params: {
  settlementLow: number
  settlementHigh: number
  liabilityPercent: number
  severityPercent: number
  completenessPercent: number
  evidenceCount: number
}) {
  const expectedSettlement = Math.max(params.settlementLow, params.settlementHigh * 0.55)
  const expectedFee = expectedSettlement * 0.33
  const estimatedCost = params.severityPercent >= 80 ? 15000 : params.severityPercent >= 60 ? 10000 : 6500
  const feeSpread = expectedFee - estimatedCost
  const economics = feeSpread >= 25000 ? 30 : feeSpread >= 12000 ? 23 : feeSpread >= 4000 ? 15 : 6
  const liability = params.liabilityPercent >= 75 ? 24 : params.liabilityPercent >= 55 ? 16 : 7
  const severity = params.severityPercent >= 75 ? 18 : params.severityPercent >= 55 ? 12 : 6
  const completeness = Math.min(14, Math.round(params.completenessPercent * 0.14))
  const evidence = Math.min(8, params.evidenceCount * 2)
  return Math.max(5, Math.min(98, Math.round(8 + economics + liability + severity + completeness + evidence)))
}

function hasTextSignal(facts: any, quality: LeadQualityDetails | null, keywords: string[]) {
  const haystack = JSON.stringify({
    facts,
    strengths: quality?.strengths || [],
    risks: quality?.risks || [],
    recommendation: quality?.recommendation?.rationale || '',
  }).toLowerCase()
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))
}

function formatNegotiationType(value?: string | null) {
  if (!value) return 'Activity'
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ')
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scrollPad: { padding: space.lg, paddingBottom: 120 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
  errorText: { fontSize: 16, color: colors.textSecondary, padding: space.lg },
  hero: {
    backgroundColor: colors.nav,
    borderRadius: radii.xl,
    padding: space.xl,
    marginBottom: space.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.brandAccent,
    ...shadows.card,
  },
  heroPlaintiff: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.4, marginBottom: 4 },
  heroType: { fontSize: 18, fontWeight: '700', color: 'rgba(248,250,252,0.95)', letterSpacing: -0.2 },
  heroStatus: { fontSize: 14, fontWeight: '600', color: 'rgba(148,163,184,0.95)', marginTop: 6 },
  heroLifecycle: { fontSize: 13, fontWeight: '700', color: colors.brandAccent, marginTop: 4 },
  nextStepCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.brandAccent + '66',
    ...shadows.soft,
  },
  nextStepHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  nextStepLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  nextStepTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  nextStepDetail: { fontSize: 14, color: colors.textSecondary, marginTop: 6, lineHeight: 20 },
  nextStepCta: { fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: space.sm },
  quickLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginBottom: space.md,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '28',
  },
  quickLinkText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  contactActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginBottom: space.md,
  },
  contactActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radii.md,
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '28',
  },
  contactActionText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  warningCard: {
    borderColor: colors.warning + '77',
    backgroundColor: colors.warningMuted,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: space.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  sectionCount: { fontSize: 13, fontWeight: '700', color: colors.primary },
  badgeText: { fontSize: 12, fontWeight: '800', color: colors.primary, textTransform: 'uppercase' },
  badgeDanger: { color: colors.danger },
  qualitySummary: { fontSize: 15, lineHeight: 22, color: colors.text, marginBottom: space.md },
  snapshotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md },
  snapshotMetric: {
    width: '48%',
    minHeight: 106,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: space.md,
  },
  snapshotMetricAccent: {
    borderColor: colors.primary + '55',
    backgroundColor: colors.primary + '10',
  },
  snapshotLabel: { fontSize: 11, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.45 },
  snapshotValue: { marginTop: 7, fontSize: 21, fontWeight: '900', color: colors.text, letterSpacing: -0.4 },
  snapshotValueAccent: { color: colors.primaryDark },
  snapshotHelper: { marginTop: 4, fontSize: 12, fontWeight: '700', color: colors.textSecondary, lineHeight: 16 },
  snapshotRationale: { marginTop: space.md, marginBottom: 0 },
  completenessCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary + '22',
    backgroundColor: colors.card,
    padding: space.md,
    marginBottom: space.sm,
  },
  completenessValue: { fontSize: 13, fontWeight: '900', color: colors.primaryDark },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: colors.primary },
  factorRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 6 },
  factorText: { fontSize: 14, color: colors.text, fontWeight: '600' },
  inlineAction: {
    alignSelf: 'flex-start',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary + '44',
    backgroundColor: colors.primary + '10',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 38,
    justifyContent: 'center',
  },
  inlineActionText: { fontSize: 14, fontWeight: '800', color: colors.primaryDark },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md },
  statusChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.card,
  },
  statusChipOn: { borderColor: colors.primary, backgroundColor: colors.primary + '14' },
  statusChipText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  statusChipTextOn: { color: colors.primaryDark },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6 },
  checkText: { flex: 1, fontSize: 14, color: colors.text },
  criticalText: { fontSize: 11, fontWeight: '800', color: colors.danger, textTransform: 'uppercase' },
  signalBlock: {
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: space.sm,
  },
  signalTitle: { fontSize: 12, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  signalText: { fontSize: 14, color: colors.text, lineHeight: 21, marginTop: 3 },
  narrative: { fontSize: 15, lineHeight: 22, color: colors.text },
  emptyEvidenceText: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileBody: { flex: 1 },
  fileName: { fontSize: 15, fontWeight: '700', color: colors.text },
  fileMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  fileReviewBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: space.sm,
  },
  fileReviewActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingBottom: space.sm },
  reviewButton: {
    borderRadius: radii.md,
    backgroundColor: colors.successMuted,
    borderWidth: 1,
    borderColor: colors.success + '55',
    paddingHorizontal: space.md,
    paddingVertical: 8,
  },
  reviewButtonWarn: {
    backgroundColor: colors.warningMuted,
    borderColor: colors.warning + '55',
  },
  reviewButtonText: { fontSize: 12, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: space.md },
  rowIcon: { marginRight: space.md, marginTop: 2 },
  rowLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  rowValue: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 2 },
  infoBanner: {
    flexDirection: 'row',
    gap: space.sm,
    backgroundColor: colors.primary + '12',
    padding: space.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  infoBannerText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
  noticeBanner: {
    marginBottom: space.md,
    padding: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: space.sm,
  },
  noticeSuccess: {
    backgroundColor: colors.successMuted,
    borderColor: colors.success,
  },
  noticeError: {
    backgroundColor: colors.dangerMuted,
    borderColor: colors.danger,
  },
  noticeCopy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  noticeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space.lg,
  },
  noticeAction: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  footerActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
    paddingBottom: space.xl,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.soft,
  },
  cta: { flex: 1, borderRadius: radii.lg, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  ctaPrimary: { backgroundColor: colors.success, shadowColor: colors.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3 },
  ctaPrimaryText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  ctaSecondary: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border },
  ctaSecondaryText: { color: colors.text, fontSize: 17, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: space.lg,
    maxHeight: '88%',
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  modalSub: { fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: space.md },
  acceptCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.successMuted,
    borderWidth: 1,
    borderColor: colors.success + '55',
  },
  acceptCardText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  reasonList: { maxHeight: 280 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reasonRowOn: { backgroundColor: colors.surface },
  reasonLabel: { fontSize: 16, color: colors.text },
  reasonLabelOn: { fontWeight: '700' },
  otherInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: space.md,
    marginTop: space.md,
    minHeight: 72,
    textAlignVertical: 'top',
    fontSize: 15,
    color: colors.text,
  },
  singleInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: space.md,
    marginTop: space.sm,
    marginBottom: space.sm,
    fontSize: 15,
    color: colors.text,
  },
  validationBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    marginTop: space.md,
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.warningMuted,
    borderWidth: 1,
    borderColor: colors.warning + '55',
  },
  validationText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  modalButtons: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
  modalCancel: {
    flex: 1,
    padding: space.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  modalAccept: { flex: 1, padding: space.lg, borderRadius: radii.lg, backgroundColor: colors.success, alignItems: 'center' },
  modalSubmit: { flex: 1, padding: space.lg, borderRadius: radii.lg, backgroundColor: colors.danger, alignItems: 'center' },
  modalSubmitDisabled: { opacity: 0.5 },
  modalSubmitText: { fontSize: 16, fontWeight: '800', color: '#fff' },
})
