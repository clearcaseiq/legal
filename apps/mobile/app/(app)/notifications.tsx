import { useCallback, useMemo, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAttorneyDashboardData } from '../../src/contexts/AttorneyDashboardContext'
import { InlineErrorBanner } from '../../src/components/InlineErrorBanner'
import { ScreenState } from '../../src/components/ScreenState'
import { colors, radii, space, shadows } from '../../src/theme/tokens'

type FeedRow = {
  id: string
  title: string
  detail: string
  icon: keyof typeof Ionicons.glyphMap
  accent: string
  route?: string
}

export default function NotificationsScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const { data, loading, error, refresh } = useAttorneyDashboardData()

  useFocusEffect(
    useCallback(() => {
      void refresh({ force: true, silent: true })
    }, [refresh])
  )

  const rows = useMemo<FeedRow[]>(() => {
    const feed: FeedRow[] = []
    const unread = Number(data?.messagingSummary?.unreadCount || 0)
    if (unread > 0) {
      feed.push({
        id: 'unread-messages',
        title: `${unread} unread message${unread === 1 ? '' : 's'}`,
        detail: 'Plaintiff conversations waiting in your inbox.',
        icon: 'chatbubbles-outline',
        accent: colors.primary,
        route: '/(app)/(tabs)/messages',
      })
    }

    for (const item of Array.isArray(data?.needsActionToday) ? data.needsActionToday : []) {
      feed.push({
        id: `action-${item.id}`,
        title: item.title || 'Action required',
        detail: item.detail || 'Open this case to review the next step.',
        icon: 'flash-outline',
        accent: item.severity === 'high' ? colors.danger : colors.warning,
        route: item.leadId ? `/(app)/lead/${item.leadId}` : '/(app)/(tabs)/inbox',
      })
    }

    for (const item of Array.isArray(data?.automationFeed) ? data.automationFeed : []) {
      feed.push({
        id: `automation-${item.id}`,
        title: item.title || 'Automation update',
        detail: item.detail || 'A workflow automation just changed state.',
        icon: 'notifications-outline',
        accent: item.severity === 'high' ? colors.danger : item.severity === 'medium' ? colors.warning : colors.primary,
        route: item.leadId ? `/(app)/lead/${item.leadId}` : '/(app)/tasks',
      })
    }

    for (const meeting of Array.isArray(data?.upcomingConsults) ? data.upcomingConsults.slice(0, 5) : []) {
      feed.push({
        id: `meeting-${meeting.id}`,
        title: meeting.plaintiffName ? `Upcoming consult with ${meeting.plaintiffName}` : 'Upcoming consult',
        detail: meeting.scheduledAt
          ? new Date(meeting.scheduledAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
          : 'Check your schedule for the latest meeting time.',
        icon: 'calendar-outline',
        accent: colors.success,
        route: meeting.leadId ? `/(app)/lead/${meeting.leadId}` : '/(app)/(tabs)/calendar',
      })
    }

    return feed
  }, [data])

  if (loading && !data) {
    return <ScreenState title="Loading alerts" message="Checking messages, meetings, and workflow activity." loading />
  }

  return (
    <View style={styles.screen}>
      {error ? (
        <View style={styles.bannerWrap}>
          <InlineErrorBanner message={error} onAction={() => { void refresh({ force: true }) }} />
        </View>
      ) : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={rows.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void refresh({ force: true }).finally(() => setRefreshing(false))
            }}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.88}
            onPress={() => {
              if (item.route) router.push(item.route as never)
            }}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${item.accent}18` }]}>
              <Ionicons name={item.icon} size={20} color={item.accent} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.detail}>{item.detail}</Text>
            </View>
            {item.route ? <Ionicons name="chevron-forward" size={18} color={colors.primary} /> : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>No alerts right now</Text>
            <Text style={styles.emptySub}>Unread messages, workflow nudges, and upcoming consults will appear here.</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  bannerWrap: { paddingHorizontal: space.lg, paddingTop: space.md },
  list: { paddingHorizontal: space.lg, paddingVertical: space.lg, paddingBottom: space.xxl },
  emptyContainer: { flexGrow: 1, paddingHorizontal: space.lg, paddingVertical: space.lg, paddingBottom: space.xxl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    ...shadows.soft,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  detail: { fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 19 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: space.md },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 21 },
})
