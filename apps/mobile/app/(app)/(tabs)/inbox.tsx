import { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../src/contexts/AuthContext'
import { useAttorneyDashboardData } from '../../../src/contexts/AttorneyDashboardContext'
import { InlineErrorBanner } from '../../../src/components/InlineErrorBanner'
import { ScreenState } from '../../../src/components/ScreenState'
import { colors, radii, space, shadows } from '../../../src/theme/tokens'
import { formatClaimType, formatStatus } from '../../../src/lib/formatLead'
import { buildPlaintiffCaseStageSummary } from '../../../src/lib/plaintiffCaseStage'
import {
  getApiErrorMessage,
  getPlaintiffCaseDashboard,
  getPlaintiffCaseTimeline,
  getPlaintiffDocumentRequests,
  type PlaintiffDocumentRequestRow,
  type PlaintiffTimelineEvent,
} from '../../../src/lib/api'

type Lead = {
  id: string
  status?: string
  viabilityScore?: number | null
  assessment?: { claimType?: string; venueState?: string; venueCounty?: string | null }
  messaging?: { unreadCount?: number; awaitingReply?: boolean }
}

type FilterKey = 'all' | 'action'

export default function InboxScreen() {
  const { user } = useAuth()

  if (user?.role === 'plaintiff') {
    return <PlaintiffUpdatesScreen />
  }

  return <AttorneyInboxScreen />
}

function AttorneyInboxScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterKey>('action')
  const { data, loading, error: loadError, refresh } = useAttorneyDashboardData()
  const leads: Lead[] = data?.recentLeads || []

  useFocusEffect(
    useCallback(() => {
      void refresh({ force: true, silent: true })
    }, [refresh])
  )

  const filtered = useMemo(() => {
    if (filter === 'all') return leads
    return leads.filter((l) => (l.status || '').toLowerCase() === 'submitted')
  }, [leads, filter])

  function renderLead({ item }: { item: Lead }) {
    const claimType = formatClaimType(item.assessment?.claimType)
    const venue = [item.assessment?.venueCounty, item.assessment?.venueState].filter(Boolean).join(', ') || '—'
    const status = formatStatus(item.status)
    const unread = item.messaging?.unreadCount || 0
    const needsDecision = (item.status || '').toLowerCase() === 'submitted'

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(app)/lead/${item.id}`)}
        activeOpacity={0.88}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{claimType}</Text>
          {needsDecision ? (
            <View style={styles.badgeUrgent}>
              <Text style={styles.badgeUrgentText}>Decide</Text>
            </View>
          ) : (
            <View style={styles.badgeNeutral}>
              <Text style={styles.badgeNeutralText}>{status}</Text>
            </View>
          )}
        </View>
        <Text style={styles.venue}>{venue}</Text>
        <View style={styles.cardFoot}>
          {item.viabilityScore != null && (
            <Text style={styles.meta}>
              Score{' '}
              {item.viabilityScore <= 1
                ? Math.round(item.viabilityScore * 100)
                : Math.round(item.viabilityScore)}
              %
            </Text>
          )}
          {unread > 0 && (
            <View style={styles.unreadRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primary} />
              <Text style={styles.unreadText}>{unread} unread</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return <ScreenState title="Loading cases" message="Fetching your current routing queue." loading />
  }

  return (
    <View style={styles.container}>
      {loadError ? (
        <InlineErrorBanner message={loadError} onAction={() => { void refresh({ force: true }) }} />
      ) : null}
      <View style={styles.chips}>
        <TouchableOpacity
          style={[styles.chip, filter === 'action' && styles.chipOn]}
          onPress={() => setFilter('action')}
        >
          <Text style={[styles.chipText, filter === 'action' && styles.chipTextOn]}>Needs review</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.chip, filter === 'all' && styles.chipOn]} onPress={() => setFilter('all')}>
          <Text style={[styles.chipText, filter === 'all' && styles.chipTextOn]}>All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderLead}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void refresh({ force: true }).finally(() => setRefreshing(false))
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>
              {loadError
                ? 'Could not load cases'
                : filter === 'action'
                  ? 'No cases awaiting a decision'
                  : 'No cases yet'}
            </Text>
            <Text style={styles.emptySub}>
              {loadError
                ? 'Use Retry above or pull down when your connection is stable.'
                : 'Routed matters will appear here. Pull down to refresh.'}
            </Text>
          </View>
        }
      />
    </View>
  )
}

function PlaintiffUpdatesScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [timeline, setTimeline] = useState<PlaintiffTimelineEvent[]>([])
  const [summary, setSummary] = useState<{
    claimType?: string
    status?: string
    nextUpdate?: string
    progressPercent?: number
    documentRequests: PlaintiffDocumentRequestRow[]
  } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const stageSummary = useMemo(
    () => buildPlaintiffCaseStageSummary({ documentRequests: summary?.documentRequests || [] }),
    [summary?.documentRequests]
  )

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      const dashboard = await getPlaintiffCaseDashboard()
      const activeCase = dashboard?.cases?.[0]

      if (!activeCase?.id) {
        setSummary(null)
        setTimeline([])
        return
      }

      const requestData = await getPlaintiffDocumentRequests(activeCase.id).catch(() => ({ requests: [] as PlaintiffDocumentRequestRow[] }))

      setSummary({
        claimType: activeCase.claimType,
        status: activeCase.status,
        nextUpdate: activeCase.transparency?.nextUpdate,
        progressPercent: activeCase.transparency?.progressPercent,
        documentRequests: requestData.requests || [],
      })

      const items = await getPlaintiffCaseTimeline(activeCase.id)
      setTimeline(Array.isArray(items) ? items : [])
    } catch (err: unknown) {
      setSummary(null)
      setTimeline([])
      setLoadError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load])
  )

  if (loading) {
    return <ScreenState title="Loading updates" message="Pulling the latest movement on your case." loading />
  }

  if (loadError && !summary) {
    return (
      <ScreenState
        title="Unable to load updates"
        message={loadError}
        icon="warning-outline"
        actionLabel="Retry"
        onAction={() => {
          setLoading(true)
          void load()
        }}
      />
    )
  }

  return (
    <FlatList
      style={styles.container}
      data={timeline}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            void load()
          }}
        />
      }
      ListHeaderComponent={
        <View style={styles.plaintiffWrap}>
          {loadError ? <InlineErrorBanner message={loadError} onAction={() => { setLoading(true); void load() }} /> : null}
          <View style={styles.plaintiffSummaryCard}>
            <Text style={styles.plaintiffLabel}>Case stage</Text>
            <Text style={styles.plaintiffHeadline}>{formatClaimType(summary?.claimType)}</Text>
            <Text style={styles.plaintiffStatus}>{formatStatus(summary?.status)}</Text>
            <Text style={styles.plaintiffCopy}>
              {summary?.nextUpdate || 'We will keep you posted as soon as something changes on your case.'}
            </Text>
            {summary ? (
              <View
                style={[
                  styles.plaintiffStageCard,
                  {
                    backgroundColor: stageSummary.background,
                    borderColor: stageSummary.border,
                  },
                ]}
              >
                <View style={styles.plaintiffStageRow}>
                  <Ionicons
                    name={stageSummary.icon}
                    size={14}
                    color={stageSummary.accent}
                  />
                  <Text
                    style={[
                      styles.plaintiffStageLabel,
                      { color: stageSummary.accent },
                    ]}
                  >
                    {stageSummary.title}
                  </Text>
                </View>
                <Text style={styles.plaintiffStageCopy}>{stageSummary.detail}</Text>
              </View>
            ) : null}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(10, Math.min(100, summary?.progressPercent || 10))}%` }]} />
            </View>
            <Text style={styles.progressCaption}>{summary?.progressPercent || 10}% through the current case journey</Text>
          </View>
          <Text style={styles.timelineHeader}>Recent updates</Text>
        </View>
      }
      contentContainerStyle={styles.plaintiffList}
      renderItem={({ item }) => (
        <View style={styles.timelineCard}>
          <View style={styles.timelineIconWrap}>
            <Ionicons
              name={item.type === 'document_uploaded' ? 'document-text-outline' : item.type === 'appointment_scheduled' ? 'calendar-outline' : 'sparkles-outline'}
              size={18}
              color={colors.primary}
            />
          </View>
          <View style={styles.timelineBody}>
            <Text style={styles.timelineTitle}>{item.title}</Text>
            <Text style={styles.timelineDescription}>{item.description}</Text>
            <Text style={styles.timelineMeta}>
              {new Date(item.date).toLocaleDateString()} · {item.status.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyTitle}>No updates yet</Text>
          <Text style={styles.emptySub}>As your case moves forward, filings, documents, meetings, and other milestones will show here.</Text>
        </View>
      }
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorBanner: {
    marginHorizontal: space.lg,
    marginTop: space.sm,
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.warningMuted,
    borderWidth: 1,
    borderColor: colors.warning,
    gap: space.sm,
  },
  errorBannerText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  errorBannerRetry: { fontSize: 15, fontWeight: '700', color: colors.primary },
  chips: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md },
  chip: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.nav, borderColor: colors.nav },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  chipTextOn: { color: '#fff' },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1, paddingRight: space.sm },
  badgeUrgent: { backgroundColor: colors.warningMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.sm },
  badgeUrgentText: { fontSize: 12, fontWeight: '800', color: colors.warning },
  badgeNeutral: { backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.sm },
  badgeNeutralText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  venue: { fontSize: 15, color: colors.textSecondary, marginTop: 6 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  meta: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  unreadRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  unreadText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  empty: { padding: 48, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: space.md },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  plaintiffWrap: { padding: space.lg, paddingBottom: space.md },
  plaintiffSummaryCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: space.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  plaintiffLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  plaintiffHeadline: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 6 },
  plaintiffStatus: { fontSize: 14, fontWeight: '700', color: colors.primaryDark, marginTop: 4 },
  plaintiffCopy: { fontSize: 15, lineHeight: 22, color: colors.textSecondary, marginTop: space.md },
  plaintiffStageCard: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  plaintiffStageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  plaintiffStageLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  plaintiffStageCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: 6,
  },
  progressTrack: { height: 10, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden', marginTop: space.md },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: colors.primary },
  progressCaption: { fontSize: 13, color: colors.textSecondary, marginTop: space.sm },
  timelineHeader: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: space.lg, marginBottom: space.sm },
  plaintiffList: { paddingBottom: space.xxl },
  timelineCard: {
    flexDirection: 'row',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    marginHorizontal: space.lg,
    marginBottom: space.md,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  timelineIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineBody: { flex: 1 },
  timelineTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  timelineDescription: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginTop: 4 },
  timelineMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 8, textTransform: 'capitalize' },
})
