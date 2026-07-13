import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../src/contexts/AuthContext'
import { useAttorneyDashboardData } from '../../../src/contexts/AttorneyDashboardContext'
import { AttorneyHomeSkeleton } from '../../../src/components/AttorneyHomeSkeleton'
import { InlineErrorBanner } from '../../../src/components/InlineErrorBanner'
import { ScreenState } from '../../../src/components/ScreenState'
import { isSameCalendarDay, navigateAttorneyQueueItem, type QueueActionType } from '../../../src/lib/attorneyQueueNav'
import { colors, radii, space, shadows, domains, type DomainId } from '../../../src/theme/tokens'
import { currencyFromMedian, formatClaimType } from '../../../src/lib/formatLead'
import { formatMeetingType, formatTime } from '../../../src/lib/calendar'
import { buildPlaintiffCaseStageSummary } from '../../../src/lib/plaintiffCaseStage'
import {
  calculateCaseSOL,
  getPlaintiffAssessment,
  getPlaintiffCaseDashboard,
  getPlaintiffCasePreparation,
  getPlaintiffDocumentRequests,
  getPlaintiffSettlementBenchmarks,
  predictAssessment,
  type PlaintiffDocumentRequestRow,
} from '../../../src/lib/api'

type Lead = {
  id: string
  status?: string
  lifecycleState?: string
  assessmentId?: string
  viabilityScore?: number | null
  assessment?: { claimType?: string; venueState?: string; venueCounty?: string | null }
  messaging?: { unreadCount?: number; awaitingReply?: boolean }
  demandReadiness?: {
    nextAction?: { title?: string; detail?: string; actionType?: string }
  }
}

type TodayQueueItem = {
  id: string
  leadId: string
  title: string
  detail?: string
  plaintiffName?: string
  claimType?: string
  severity?: string
  actionType?: QueueActionType
  actionLabel?: string
  dueAt?: string
}

type PlaintiffCaseCard = {
  id: string
  claimType?: string
  venue?: { state?: string; county?: string | null }
  status?: string
  facts?: {
    treatment?: unknown[]
  }
  transparency?: {
    plainEnglish?: string
    nextUpdate?: string
    progressPercent?: number
    settlementExpectation?: {
      median?: number
      rangeLow?: number
      rangeHigh?: number
      confidence?: string
      note?: string
    }
  }
}

type PlaintiffSummaryPayload = {
  summary?: {
    totalCases?: number
    activeCases?: number
    totalValue?: number
    upcomingAppointments?: number
    pendingMessages?: number
  }
  cases?: PlaintiffCaseCard[]
}

type PlaintiffCaseInsights = {
  prediction: any | null
  preparation: any | null
  benchmarks: any | null
  sol: any | null
  documentRequests: PlaintiffDocumentRequestRow[]
}

function buildPlaintiffTimeline(params: {
  claimType?: string
  missingDocCount: number
  hasTreatment: boolean
  severityLevel?: number
}) {
  const ranges: Record<string, [number, number]> = {
    auto: [6, 12],
    slip_and_fall: [8, 14],
    medmal: [18, 30],
    dog_bite: [5, 10],
    product: [12, 24],
  }
  const [baseMin, baseMax] = ranges[params.claimType || ''] || [8, 16]
  const docPenalty = params.missingDocCount >= 4 ? 4 : params.missingDocCount >= 2 ? 2 : params.missingDocCount > 0 ? 1 : 0
  const treatmentPenalty = params.hasTreatment ? 0 : 2
  const severePenalty = (params.severityLevel || 0) >= 3 ? 3 : 0
  return `${baseMin + docPenalty + treatmentPenalty}-${baseMax + docPenalty + treatmentPenalty + severePenalty} months`
}

type HubEntry = {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  description: string
  badge?: number
  onPress: () => void
}

export default function HomeScreen() {
  const { user } = useAuth()

  if (user?.role === 'plaintiff') {
    return <PlaintiffHomeScreen />
  }

  return <AttorneyHomeDashboardScreen />
}

function AttorneyHomeDashboardScreen() {
  const { user } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  const { data: payload, loading, error: loadError, isOfflineSnapshot, refresh } = useAttorneyDashboardData()

  useFocusEffect(
    useCallback(() => {
      void refresh({ force: true, silent: true })
    }, [refresh])
  )

  const recentLeads: Lead[] = payload?.recentLeads || []
  const needsReview = recentLeads.filter((l) => (l.status || '').toLowerCase() === 'submitted')
  const messagingSummaryRaw = payload?.messagingSummary || {}
  const messagingSummary = {
    unreadCount: Number(messagingSummaryRaw.unreadCount ?? 0),
    awaitingResponseCount: Number(messagingSummaryRaw.awaitingResponseCount ?? 0),
  }
  const automationFeed = Array.isArray(payload?.automationFeed) ? payload.automationFeed.slice(0, 4) : []
  const needsActionToday: TodayQueueItem[] = Array.isArray(payload?.needsActionToday)
    ? payload.needsActionToday
    : []
  const upcomingConsults: Array<{
    id: string
    leadId?: string
    scheduledAt: string
    type?: string
    plaintiffName?: string
    claimType?: string
  }> = payload?.upcomingConsults || []
  const meetingsToday = upcomingConsults.filter((c) => c.scheduledAt && isSameCalendarDay(c.scheduledAt))
  const qa = payload?.quickActionCounts || {}

  const todayCount =
    needsActionToday.length +
    meetingsToday.length +
    (messagingSummary.awaitingResponseCount > 0 ? 1 : 0)
  const reviewSlaLabel = needsReview.length > 0
    ? `${needsReview.length} lead${needsReview.length === 1 ? '' : 's'} waiting`
    : 'No pending lead decisions'
  const primaryCommand = (() => {
    if (needsActionToday[0]) {
      const item = needsActionToday[0]
      return {
        icon: item.severity === 'high' ? 'alert-circle-outline' : 'flash-outline',
        eyebrow: item.severity === 'high' ? 'Urgent next action' : 'Best next action',
        title: item.title,
        detail: item.detail || `${item.plaintiffName || 'Plaintiff'} · ${formatClaimType(item.claimType)}`,
        actionLabel: item.actionLabel || 'Open',
        onPress: () => navigateAttorneyQueueItem({
          actionType: (item.actionType || 'open_lead') as QueueActionType,
          leadId: item.leadId,
        }),
      }
    }
    if (messagingSummary.awaitingResponseCount > 0) {
      return {
        icon: 'chatbubbles-outline',
        eyebrow: 'Communication',
        title: 'Reply to waiting plaintiffs',
        detail: `${messagingSummary.awaitingResponseCount} conversation${messagingSummary.awaitingResponseCount === 1 ? '' : 's'} need a response.`,
        actionLabel: 'Open messages',
        onPress: () => router.push('/(app)/(tabs)/messages'),
      }
    }
    if (meetingsToday[0]) {
      const meeting = meetingsToday[0]
      return {
        icon: 'calendar-outline',
        eyebrow: 'Consult today',
        title: `${formatMeetingType(meeting.type)} at ${formatTime(meeting.scheduledAt)}`,
        detail: `${meeting.plaintiffName || 'Plaintiff'} · ${formatClaimType(meeting.claimType)}`,
        actionLabel: 'Open case',
        onPress: () => meeting.leadId ? router.push(`/(app)/lead/${meeting.leadId}`) : router.push('/(app)/(tabs)/calendar'),
      }
    }
    if (needsReview[0]) {
      const lead = needsReview[0]
      return {
        icon: 'mail-unread-outline',
        eyebrow: 'Review queue',
        title: 'Review newest lead match',
        detail: `${formatClaimType(lead.assessment?.claimType)} · ${[lead.assessment?.venueCounty, lead.assessment?.venueState].filter(Boolean).join(', ') || 'Venue pending'}`,
        actionLabel: 'Review lead',
        onPress: () => router.push(`/(app)/lead/${lead.id}`),
      }
    }
    return {
      icon: 'shield-checkmark-outline',
      eyebrow: 'Pipeline clear',
      title: 'No urgent attorney actions',
      detail: 'Your messages, lead decisions, and consults are caught up.',
      actionLabel: 'Open cases',
      onPress: () => router.push('/(app)/(tabs)/inbox'),
    }
  })()

  const alertsCount = (automationFeed?.length || 0) + (needsActionToday?.length || 0)

  // Two colour-coded domains, mirroring the attorney web workspace sidebar.
  const leadgenNav: HubEntry[] = [
    {
      icon: 'mail-unread-outline',
      label: 'New Matches',
      description: 'Cases awaiting your review',
      badge: needsReview.length,
      onPress: () => router.push('/(app)/new-matches'),
    },
    {
      icon: 'stats-chart-outline',
      label: 'Match Quality',
      description: 'Accept & conversion metrics',
      onPress: () => router.push('/(app)/match-quality'),
    },
    {
      icon: 'trending-up-outline',
      label: 'Marketplace Performance',
      description: 'Routing spend & return',
      onPress: () => router.push('/(app)/marketplace'),
    },
  ]

  const caseworkNav: HubEntry[] = [
    {
      icon: 'folder-open-outline',
      label: 'Active Cases',
      description: 'Your full caseload',
      onPress: () => router.push({ pathname: '/(app)/(tabs)/inbox', params: { filter: 'all' } }),
    },
    {
      icon: 'add-circle-outline',
      label: 'Add Case',
      description: 'Log a new matter manually',
      onPress: () => router.push('/(app)/manual-case'),
    },
    {
      icon: 'calendar-outline',
      label: 'Calendar & Consults',
      description: 'Upcoming meetings',
      badge: upcomingConsults.length,
      onPress: () => router.push('/(app)/(tabs)/calendar'),
    },
    {
      icon: 'chatbubbles-outline',
      label: 'Messages',
      description: 'Client & adjuster threads',
      badge: messagingSummary.unreadCount,
      onPress: () => router.push('/(app)/(tabs)/messages'),
    },
    {
      icon: 'document-attach-outline',
      label: 'Documents',
      description: 'Requests & uploads',
      badge: Number(qa.documentRequests ?? 0),
      onPress: () => router.push('/(app)/document-requests'),
    },
    {
      icon: 'checkbox-outline',
      label: 'Tasks',
      description: 'Cross-case queue',
      badge: Number(qa.tasks ?? 0),
      onPress: () => router.push('/(app)/tasks'),
    },
    {
      icon: 'people-outline',
      label: 'Contacts',
      description: 'Parties directory',
      badge: Number(qa.caseContacts ?? 0),
      onPress: () => router.push('/(app)/contacts'),
    },
    {
      icon: 'search-outline',
      label: 'Search',
      description: 'Find cases across your book',
      onPress: () => router.push('/(app)/search'),
    },
    {
      icon: 'wallet-outline',
      label: 'Billing',
      description: 'Fees, invoices & costs',
      onPress: () => router.push('/(app)/billing'),
    },
    {
      icon: 'notifications-outline',
      label: 'Alerts',
      description: 'Automation & reminders',
      badge: alertsCount,
      onPress: () => router.push('/(app)/notifications'),
    },
  ]

  if (loading && !payload) {
    return (
      <View style={styles.screen}>
        <AttorneyHomeSkeleton />
      </View>
    )
  }

  const greeting = user?.firstName ? `Hi, ${user.firstName}` : 'Welcome'
  const profileName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Attorney'
  const profileFirm = (user as { firmName?: string } | null)?.firmName || 'Attorney workspace'
  const hubInitials =
    profileName
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'A'

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            void refresh({ force: true }).finally(() => setRefreshing(false))
          }}
        />
      }
    >
      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => router.push('/(app)/(tabs)/account')}
        activeOpacity={0.9}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{hubInitials}</Text>
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileName} numberOfLines={1}>{profileName}</Text>
          <Text style={styles.profileSub} numberOfLines={1}>{profileFirm}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </TouchableOpacity>

      <View style={styles.breadcrumb}>
        <Text style={styles.breadcrumbBrand}>ClearCaseIQ</Text>
        <Text style={styles.breadcrumbSep}>/</Text>
        <Text style={styles.breadcrumbLeaf}>Workspace</Text>
      </View>

      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.subGreeting}>Your pipeline at a glance</Text>

      {loadError ? (
        <InlineErrorBanner
          message={isOfflineSnapshot ? `${loadError} Showing your last saved dashboard snapshot.` : loadError}
          onAction={() => {
            void refresh({ force: true })
          }}
        />
      ) : null}

      <TouchableOpacity style={styles.commandCard} onPress={primaryCommand.onPress} activeOpacity={0.9}>
        <View style={styles.commandTop}>
          <View style={styles.commandIcon}>
            <Ionicons name={primaryCommand.icon as keyof typeof Ionicons.glyphMap} size={22} color="#fff" />
          </View>
          <View style={styles.commandCopy}>
            <Text style={styles.commandEyebrow}>{primaryCommand.eyebrow}</Text>
            <Text style={styles.commandTitle}>{primaryCommand.title}</Text>
            <Text style={styles.commandDetail}>{primaryCommand.detail}</Text>
          </View>
        </View>
        <View style={styles.commandFooter}>
          <Text style={styles.commandSla}>{reviewSlaLabel}</Text>
          <Text style={styles.commandCta}>{primaryCommand.actionLabel} →</Text>
        </View>
      </TouchableOpacity>

      {todayCount > 0 ? (
        <View style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <Text style={styles.todayTitle}>Today</Text>
            <Text style={styles.todayBadge}>{todayCount}</Text>
          </View>
          <Text style={styles.todaySub}>
            {needsActionToday.length > 0
              ? `${needsActionToday.length} prioritized action${needsActionToday.length === 1 ? '' : 's'}`
              : 'Catch up on meetings and messages'}
            {messagingSummary.awaitingResponseCount > 0
              ? ` · ${messagingSummary.awaitingResponseCount} conversation${messagingSummary.awaitingResponseCount === 1 ? '' : 's'} need a reply`
              : ''}
          </Text>
          {messagingSummary.awaitingResponseCount > 0 ? (
            <TouchableOpacity
              style={styles.todayRow}
              onPress={() => router.push('/(app)/(tabs)/messages')}
              activeOpacity={0.85}
            >
              <Ionicons name="chatbubbles-outline" size={22} color={colors.primary} />
              <View style={styles.todayRowBody}>
                <Text style={styles.todayRowTitle}>Reply to plaintiffs</Text>
                <Text style={styles.todayRowMeta}>
                  {messagingSummary.awaitingResponseCount} thread{messagingSummary.awaitingResponseCount === 1 ? '' : 's'} awaiting your response
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
          {meetingsToday.slice(0, 3).map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.todayRow}
              onPress={() =>
                c.leadId ? router.push(`/(app)/lead/${c.leadId}`) : router.push('/(app)/(tabs)/calendar')
              }
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={22} color={colors.warning} />
              <View style={styles.todayRowBody}>
                <Text style={styles.todayRowTitle}>{formatMeetingType(c.type)} · {formatTime(c.scheduledAt)}</Text>
                <Text style={styles.todayRowMeta}>
                  {c.plaintiffName || 'Plaintiff'} · {formatClaimType(c.claimType)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
          ))}
          {needsActionToday.slice(0, 4).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.todayRow}
              onPress={() =>
                navigateAttorneyQueueItem({
                  actionType: (item.actionType || 'open_lead') as QueueActionType,
                  leadId: item.leadId,
                })
              }
              activeOpacity={0.85}
            >
              <Ionicons
                name={item.severity === 'high' ? 'alert-circle-outline' : 'flash-outline'}
                size={22}
                color={item.severity === 'high' ? colors.danger : colors.primary}
              />
              <View style={styles.todayRowBody}>
                <Text style={styles.todayRowTitle}>{item.title}</Text>
                <Text style={styles.todayRowMeta} numberOfLines={2}>
                  {item.plaintiffName ? `${item.plaintiffName} · ` : ''}
                  {formatClaimType(item.claimType)}
                  {item.detail ? ` — ${item.detail}` : ''}
                </Text>
              </View>
              <Text style={styles.todayCta}>{item.actionLabel || 'Open'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.todayEmpty}>
          <Ionicons name="sunny-outline" size={22} color={colors.muted} />
          <Text style={styles.todayEmptyText}>Nothing urgent for today — you’re in good shape.</Text>
        </View>
      )}

      <DomainSection domain="leadgen" entries={leadgenNav} />
      <DomainSection domain="casework" entries={caseworkNav} />
    </ScrollView>
  )
}

function PlaintiffHomeScreen() {
  const { user } = useAuth()
  const [payload, setPayload] = useState<PlaintiffSummaryPayload | null>(null)
  const [insights, setInsights] = useState<PlaintiffCaseInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeCase = useMemo(() => payload?.cases?.[0] || null, [payload])

  const loadPlaintiffDashboard = useCallback(async () => {
    try {
      setError(null)
      const dashboard = await getPlaintiffCaseDashboard()
      setPayload(dashboard)

      const firstCase = dashboard?.cases?.[0]
      if (!firstCase?.id) {
        setInsights(null)
        return
      }

      const [assessment, prediction, preparation, benchmarks, requestData] = await Promise.all([
        getPlaintiffAssessment(firstCase.id),
        predictAssessment(firstCase.id).catch(() => null),
        getPlaintiffCasePreparation(firstCase.id).catch(() => null),
        getPlaintiffSettlementBenchmarks(firstCase.id).catch(() => null),
        getPlaintiffDocumentRequests(firstCase.id).catch(() => ({ requests: [] as PlaintiffDocumentRequestRow[] })),
      ])

      const facts = assessment?.facts || {}
      const incidentDate = facts?.incident?.date
      const sol =
        incidentDate && assessment?.claimType && assessment?.venue?.state
          ? await calculateCaseSOL(
              incidentDate,
              { state: assessment.venue.state, county: assessment.venue.county || undefined },
              assessment.claimType
            ).catch(() => null)
          : null

      setInsights({
        prediction,
        preparation,
        benchmarks,
        sol,
        documentRequests: requestData.requests || [],
      })
    } catch (err: unknown) {
      setPayload(null)
      setInsights(null)
      setError(err instanceof Error ? err.message : 'Unable to load your case summary right now.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPlaintiffDashboard()
  }, [loadPlaintiffDashboard])

  useFocusEffect(
    useCallback(() => {
      void loadPlaintiffDashboard()
    }, [loadPlaintiffDashboard])
  )

  if (loading && !payload) {
    return <ScreenState title="Loading your case" message="Pulling your latest case summary." loading />
  }

  if (!activeCase) {
    return (
      <ScreenState
        title="No case linked yet"
        message="Once you complete intake and save your case to your account, your mobile case summary will show up here."
        icon="document-text-outline"
        actionLabel={error ? 'Try again' : undefined}
        onAction={error ? () => { setLoading(true); void loadPlaintiffDashboard() } : undefined}
      />
    )
  }

  const rangeLow = insights?.prediction?.value_bands?.p25 ?? activeCase.transparency?.settlementExpectation?.rangeLow ?? 0
  const rangeHigh = insights?.prediction?.value_bands?.p75 ?? activeCase.transparency?.settlementExpectation?.rangeHigh ?? 0
  const liability = insights?.prediction?.liability
  const liabilityScore = insights?.prediction?.viability?.liability ?? 0.5
  const liabilityLabel = liabilityScore >= 0.7 ? 'Strong' : liabilityScore >= 0.4 ? 'Moderate' : 'Unclear'
  const liabilitySummary =
    Array.isArray(liability?.factors) && liability.factors.length > 0
      ? liability.factors[0]
      : 'We need a few more facts to sharpen the liability analysis.'
  const missingDocs = Array.isArray(insights?.preparation?.missingDocs) ? insights?.preparation?.missingDocs : []
  const urgentRequest = insights?.documentRequests?.find((request) => request.status !== 'completed') || null
  const timeline = buildPlaintiffTimeline({
    claimType: activeCase.claimType,
    missingDocCount: missingDocs.length,
    hasTreatment: Array.isArray(activeCase.facts?.treatment) ? activeCase.facts.treatment.length > 0 : false,
    severityLevel: insights?.prediction?.severity?.level,
  })
  const solDeadline = insights?.sol?.expiresAt ? new Date(insights.sol.expiresAt).toLocaleDateString() : null
  const solRemaining = insights?.sol?.daysRemaining != null ? `${Math.max(0, insights.sol.daysRemaining)} days left` : 'Need incident date'
  const benchmarkMedian = insights?.benchmarks?.p50 ? currencyFromMedian(insights.benchmarks.p50) : null
  const caseStageSummary = buildPlaintiffCaseStageSummary({
    documentRequests: insights?.documentRequests || [],
    missingDocs,
  })

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            void loadPlaintiffDashboard().finally(() => setRefreshing(false))
          }}
        />
      }
    >
      <Text style={styles.greeting}>{user?.firstName ? `Hi, ${user.firstName}` : 'Your case'}</Text>
      <Text style={styles.subGreeting}>Your answers right now</Text>

      {error ? <InlineErrorBanner message={error} onAction={() => { setLoading(true); void loadPlaintiffDashboard() }} /> : null}

      <View style={styles.plaintiffHero}>
        <Text style={styles.plaintiffHeroTitle}>{formatClaimType(activeCase.claimType)}</Text>
        <Text style={styles.plaintiffHeroMeta}>
          {[activeCase.venue?.county, activeCase.venue?.state].filter(Boolean).join(', ') || 'Venue pending'}
        </Text>
        <Text style={styles.plaintiffHeroStatus}>{activeCase.transparency?.plainEnglish || 'We are reviewing your case.'}</Text>
        <View
          style={[
            styles.plaintiffStageCard,
            {
              backgroundColor: caseStageSummary.background,
              borderColor: caseStageSummary.border,
            },
          ]}
        >
          <View style={styles.plaintiffStageChip}>
            <Ionicons name={caseStageSummary.icon} size={14} color={caseStageSummary.accent} />
            <Text style={[styles.plaintiffStageChipText, { color: caseStageSummary.accent }]}>Case stage</Text>
          </View>
          <Text style={styles.plaintiffStageTitle}>{caseStageSummary.title}</Text>
          <Text style={styles.plaintiffStageCopy}>{caseStageSummary.detail}</Text>
          {missingDocs.length > 0 || urgentRequest ? (
            <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/calendar')} activeOpacity={0.8}>
              <Text style={styles.plaintiffStageLink}>Review document tasks</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.plaintiffGrid}>
        <PlaintiffMetricCard
          label="Likely settlement range"
          value={rangeLow && rangeHigh ? `${currencyFromMedian(rangeLow) || '$0'} - ${currencyFromMedian(rangeHigh) || '$0'}` : 'Need more data'}
          detail={benchmarkMedian ? `Comparable cases often center around ${benchmarkMedian}.` : 'This estimate sharpens as records come in.'}
        />
        <PlaintiffMetricCard
          label="Likely timeline"
          value={timeline}
          detail={activeCase.transparency?.nextUpdate || 'Missing records can slow the next step.'}
        />
        <PlaintiffMetricCard
          label="Liability view"
          value={liabilityLabel}
          detail={liabilitySummary}
        />
        <PlaintiffMetricCard
          label="Filing deadline"
          value={solDeadline || 'Need incident date'}
          detail={solDeadline ? solRemaining : 'Add your incident date on web to confirm this.'}
        />
      </View>

      <View style={styles.plaintiffCard}>
        <Text style={styles.sectionTitle}>Action Center</Text>
        {urgentRequest ? (
          <>
            <Text style={styles.plaintiffBody}>
              {urgentRequest.attorney?.name || 'Your attorney'} is waiting on{' '}
              {urgentRequest.remainingDocs.length > 0
                ? urgentRequest.remainingDocs.length === 1
                  ? urgentRequest.items.find((item) => item.key === urgentRequest.remainingDocs[0])?.label || 'a requested document'
                  : `${urgentRequest.remainingDocs.length} requested documents`
                : 'supporting documents'}.
            </Text>
            <View style={styles.tagWrap}>
              {(urgentRequest.items || []).filter((item) => !item.fulfilled).map((item) => (
                <View key={item.key} style={styles.tagWarning}>
                  <Text style={styles.tagWarningText}>{item.label}</Text>
                </View>
              ))}
            </View>
            {urgentRequest.uploadLink ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  router.push('/(app)/(tabs)/calendar')
                }}
              >
                <Text style={styles.primaryButtonText}>Upload in app</Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : missingDocs.length > 0 ? (
          <>
            <Text style={styles.plaintiffBody}>No attorney has requested documents yet, but these missing items would strengthen your case fastest.</Text>
            <View style={styles.tagWrap}>
              {missingDocs.slice(0, 4).map((item: any) => (
                <View key={item.key} style={styles.tagNeutral}>
                  <Text style={styles.tagNeutralText}>{item.label}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.plaintiffBody}>No major document gaps were detected from your current file.</Text>
        )}
      </View>

      <View style={styles.plaintiffCard}>
        <Text style={styles.sectionTitle}>What to expect next</Text>
        <Text style={styles.plaintiffBody}>{activeCase.transparency?.nextUpdate || 'We will keep you updated as your case moves forward.'}</Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(10, Math.min(100, activeCase.transparency?.progressPercent || 10))}%` },
            ]}
          />
        </View>
        <Text style={styles.progressLabel}>{activeCase.transparency?.progressPercent || 10}% through the current case journey</Text>
      </View>
    </ScrollView>
  )
}

function DomainSection({ domain, entries }: { domain: DomainId; entries: HubEntry[] }) {
  const d = domains[domain]
  return (
    <View style={styles.domainSection}>
      <View style={styles.domainHeader}>
        <View style={[styles.domainDot, { backgroundColor: d.accent }]} />
        <Text style={styles.domainLabel}>{d.label}</Text>
      </View>
      <View style={styles.domainCard}>
        {entries.map((entry, i) => (
          <HubRow key={entry.label} entry={entry} accent={d.accent} first={i === 0} />
        ))}
      </View>
    </View>
  )
}

function HubRow({ entry, accent, first }: { entry: HubEntry; accent: string; first: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.hubRow, !first && styles.hubRowDivider]}
      onPress={entry.onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.hubChip, { backgroundColor: accent + '14' }]}>
        <Ionicons name={entry.icon} size={18} color={accent} />
      </View>
      <View style={styles.hubCopy}>
        <Text style={styles.hubLabel}>{entry.label}</Text>
        <Text style={styles.hubDescription}>{entry.description}</Text>
      </View>
      {entry.badge && entry.badge > 0 ? (
        <View style={[styles.hubBadge, { backgroundColor: accent }]}>
          <Text style={styles.hubBadgeText}>{entry.badge > 99 ? '99+' : entry.badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </TouchableOpacity>
  )
}

function PlaintiffMetricCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <View style={styles.plaintiffMetricCard}>
      <Text style={styles.plaintiffMetricLabel}>{label}</Text>
      <Text style={styles.plaintiffMetricValue}>{value}</Text>
      <Text style={styles.plaintiffMetricDetail}>{detail}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space.lg, paddingBottom: space.xxl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  profileCopy: { flex: 1, minWidth: 0 },
  profileName: { fontSize: 15, fontWeight: '800', color: colors.text },
  profileSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.md, marginBottom: space.sm },
  breadcrumbBrand: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  breadcrumbSep: { fontSize: 12, color: colors.muted },
  breadcrumbLeaf: { fontSize: 12, fontWeight: '600', color: colors.muted },
  domainSection: { marginTop: space.lg },
  domainHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm, paddingHorizontal: space.xs },
  domainDot: { width: 8, height: 8, borderRadius: 4 },
  domainLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  domainCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.soft,
  },
  hubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  hubRowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  hubChip: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubCopy: { flex: 1, minWidth: 0 },
  hubLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  hubDescription: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  hubBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  greeting: { fontSize: 28, fontWeight: '800', color: colors.text },
  subGreeting: { fontSize: 15, color: colors.textSecondary, marginTop: 4, marginBottom: space.lg },
  quickActionRow: { flexDirection: 'row', gap: space.md, marginBottom: space.lg },
  quickActionButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    ...shadows.soft,
  },
  quickActionText: { fontSize: 15, fontWeight: '800', color: colors.text },
  commandCard: {
    backgroundColor: colors.nav,
    borderRadius: radii.xl,
    padding: space.lg,
    marginBottom: space.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.brandAccent,
    ...shadows.card,
  },
  commandTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  commandIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  commandCopy: { flex: 1 },
  commandEyebrow: { fontSize: 11, fontWeight: '800', color: colors.brandAccent, letterSpacing: 0.8, textTransform: 'uppercase' },
  commandTitle: { fontSize: 19, fontWeight: '800', color: '#fff', marginTop: 4 },
  commandDetail: { fontSize: 14, lineHeight: 20, color: 'rgba(226,232,240,0.92)', marginTop: 6 },
  commandFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    marginTop: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226,232,240,0.18)',
  },
  commandSla: { flex: 1, fontSize: 12, color: 'rgba(226,232,240,0.78)', fontWeight: '600' },
  commandCta: { fontSize: 14, fontWeight: '800', color: colors.brandAccent },
  todayCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: space.lg,
    marginBottom: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  todayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  todayTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  todayBadge: {
    minWidth: 28,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.primary + '18',
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  todaySub: { fontSize: 13, color: colors.textSecondary, marginBottom: space.md, lineHeight: 20 },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  todayRowBody: { flex: 1, minWidth: 0 },
  todayRowTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  todayRowMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  todayCta: { fontSize: 13, fontWeight: '700', color: colors.primary },
  todayEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  todayEmptyText: { flex: 1, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  errorBanner: {
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.warningMuted,
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: space.md,
    gap: space.sm,
  },
  errorBannerText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  errorBannerRetry: { fontSize: 15, fontWeight: '700', color: colors.primary },
  statRow: { flexDirection: 'row', gap: space.md, marginBottom: space.md },
  statTile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
  },
  statValue: { fontSize: 24, fontWeight: '800', marginTop: space.sm },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontWeight: '600' },
  highlight: {
    backgroundColor: colors.primary + '12',
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.lg,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: colors.brandAccent,
    borderColor: colors.primary + '28',
    ...shadows.soft,
  },
  highlightLabel: { fontSize: 12, color: colors.primaryDark, fontWeight: '600' },
  highlightValue: { fontSize: 22, fontWeight: '800', color: colors.primaryDark, marginTop: 4 },
  automationBlock: { marginBottom: space.lg },
  automationCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  automationTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  automationSeverity: { fontSize: 11, fontWeight: '800', letterSpacing: 0.7 },
  automationDue: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  automationTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  automationDetail: { fontSize: 14, color: colors.textSecondary, marginTop: 6, lineHeight: 20 },
  automationMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 8 },
  automationActions: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  automationPrimaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  automationPrimaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  automationSecondaryButton: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  automationSecondaryButtonText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  meetingsBlock: { marginBottom: space.lg },
  meetingCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  meetingCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  meetingTime: { fontSize: 17, fontWeight: '800', color: colors.text },
  meetingType: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  meetingName: { fontSize: 16, fontWeight: '700', color: colors.text },
  meetingClaim: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  sectionLink: { fontSize: 14, fontWeight: '600', color: colors.primary },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: space.md },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
  queueCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  queueTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  queueTitle: { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1 },
  scorePill: { backgroundColor: colors.successMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.sm },
  scoreText: { fontSize: 12, fontWeight: '700', color: colors.success },
  queueMeta: { fontSize: 14, color: colors.textSecondary, marginTop: 6 },
  queueStatus: { fontSize: 12, fontWeight: '600', color: colors.warning, marginTop: 8 },
  queueLifecycle: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  plaintiffHero: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: space.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.lg,
    ...shadows.card,
  },
  plaintiffHeroTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  plaintiffHeroMeta: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  plaintiffHeroStatus: { fontSize: 15, lineHeight: 22, color: colors.text, marginTop: space.md },
  plaintiffStageCard: {
    marginTop: space.lg,
    padding: space.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  plaintiffStageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  plaintiffStageChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  plaintiffStageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: space.sm,
  },
  plaintiffStageCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: 6,
  },
  plaintiffStageLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginTop: space.md,
  },
  plaintiffGrid: { gap: space.md, marginBottom: space.lg },
  plaintiffMetricCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  plaintiffMetricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  plaintiffMetricValue: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 6 },
  plaintiffMetricDetail: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginTop: 6 },
  plaintiffCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: space.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.lg,
    ...shadows.card,
  },
  plaintiffBody: { fontSize: 15, lineHeight: 22, color: colors.textSecondary },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md, marginBottom: space.md },
  tagWarning: {
    backgroundColor: colors.warningMuted,
    borderRadius: 999,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderWidth: 1,
    borderColor: colors.warning + '55',
  },
  tagWarningText: { color: colors.warning, fontSize: 13, fontWeight: '700' },
  tagNeutral: {
    backgroundColor: colors.primary + '10',
    borderRadius: 999,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  tagNeutralText: { color: colors.primaryDark, fontSize: 13, fontWeight: '700' },
  primaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: space.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  progressLabel: { fontSize: 13, color: colors.textSecondary, marginTop: space.sm },
})
