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
import { getLeadDetails, decideLead, getApiErrorMessage, getLeadEvidenceFiles, getLeadQuality, toAbsoluteApiUrl, type LeadEvidenceFile, type LeadQualityDetails } from '../../../src/lib/api'
import { InlineErrorBanner } from '../../../src/components/InlineErrorBanner'
import { ScreenState } from '../../../src/components/ScreenState'
import { useAttorneyDashboardData } from '../../../src/contexts/AttorneyDashboardContext'
import { navigateAttorneyQueueItem, type QueueActionType } from '../../../src/lib/attorneyQueueNav'
import { DECLINE_REASONS, type DeclineReasonCode } from '../../../src/constants/declineReasons'
import { colors, radii, space, shadows } from '../../../src/theme/tokens'
import { formatClaimType, formatLifecycleState, formatStatus, parseFacts } from '../../../src/lib/formatLead'

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
    } catch (err: unknown) {
      setLead(null)
      setEvidenceFiles([])
      setLeadQuality(null)
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
              navigateAttorneyQueueItem({
                actionType: (suggestedNext.actionType || 'open_lead') as QueueActionType,
                leadId: id,
              })
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
          <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/(app)/(tabs)/messages')} activeOpacity={0.85}>
            <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
            <Text style={styles.quickLinkText}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/(app)/tasks')} activeOpacity={0.85}>
            <Ionicons name="checkbox-outline" size={18} color={colors.primary} />
            <Text style={styles.quickLinkText}>Tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/(app)/document-requests')} activeOpacity={0.85}>
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
                  <TouchableOpacity style={styles.contactActionBtn} onPress={() => { void openExternal(`tel:${plaintiffPhone}`) }}>
                    <Ionicons name="call-outline" size={16} color={colors.primary} />
                    <Text style={styles.contactActionText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.contactActionBtn} onPress={() => { void openExternal(`sms:${plaintiffPhone}`) }}>
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
                    <Text style={styles.contactActionText}>Text</Text>
                  </TouchableOpacity>
                </>
              ) : null}
              {plaintiffEmail ? (
                <TouchableOpacity style={styles.contactActionBtn} onPress={() => { void openExternal(`mailto:${plaintiffEmail}`) }}>
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

        {leadQuality ? (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.cardTitle}>Mobile case intelligence</Text>
              {leadQuality.qualityScore != null || leadQuality.readinessScore != null ? (
                <Text style={styles.sectionCount}>
                  {Math.round(Number(leadQuality.qualityScore ?? leadQuality.readinessScore ?? 0))}%
                </Text>
              ) : null}
            </View>
            {leadQuality.recommendation?.rationale ? (
              <Text style={styles.qualitySummary}>{leadQuality.recommendation.rationale}</Text>
            ) : leadQuality.demandReadiness?.label ? (
              <Text style={styles.qualitySummary}>{leadQuality.demandReadiness.label}</Text>
            ) : (
              <Text style={styles.qualitySummary}>Use the signals below to triage this case from your phone.</Text>
            )}
            {Array.isArray(leadQuality.strengths) && leadQuality.strengths.length > 0 ? (
              <View style={styles.signalBlock}>
                <Text style={styles.signalTitle}>Strengths</Text>
                {leadQuality.strengths.slice(0, 3).map((item) => (
                  <Text key={item} style={styles.signalText}>• {item}</Text>
                ))}
              </View>
            ) : null}
            {Array.isArray(leadQuality.risks) && leadQuality.risks.length > 0 ? (
              <View style={styles.signalBlock}>
                <Text style={styles.signalTitle}>Watch items</Text>
                {leadQuality.risks.slice(0, 3).map((item) => (
                  <Text key={item} style={styles.signalText}>• {item}</Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

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
              <TouchableOpacity
                key={file.id}
                style={styles.fileRow}
                onPress={() => {
                  void openEvidenceFile(file)
                }}
                activeOpacity={0.85}
              >
                <View style={styles.fileIconWrap}>
                  <Ionicons name="document-attach-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.fileBody}>
                  <Text style={styles.fileName}>{file.originalName || file.filename}</Text>
                  <Text style={styles.fileMeta}>{formatEvidenceMeta(file)}</Text>
                </View>
                <Ionicons name="open-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
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
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: space.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  sectionCount: { fontSize: 13, fontWeight: '700', color: colors.primary },
  qualitySummary: { fontSize: 15, lineHeight: 22, color: colors.text, marginBottom: space.md },
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
