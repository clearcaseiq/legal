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
import {
  getApiErrorMessage,
  getAttorneyChatRooms,
  getPlaintiffCaseDashboard,
  getPlaintiffChatRooms,
  getPlaintiffDocumentRequests,
  type AttorneyChatRoom,
  type PlaintiffChatRoom,
  type PlaintiffDocumentRequestRow,
} from '../../../src/lib/api'
import { InlineErrorBanner } from '../../../src/components/InlineErrorBanner'
import { ScreenState } from '../../../src/components/ScreenState'
import { colors, radii, space, shadows } from '../../../src/theme/tokens'
import { formatClaimType } from '../../../src/lib/formatLead'
import { buildPlaintiffCaseStageSummary } from '../../../src/lib/plaintiffCaseStage'

export default function MessagesScreen() {
  const { user } = useAuth()

  if (user?.role === 'plaintiff') {
    return <PlaintiffMessagesScreen />
  }

  return <AttorneyMessagesScreen />
}

function AttorneyMessagesScreen() {
  const [rooms, setRooms] = useState<AttorneyChatRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      const data = await getAttorneyChatRooms()
      setRooms(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      setRooms([])
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

  function openRoom(room: AttorneyChatRoom) {
    router.push(`/(app)/chat/${room.id}`)
  }

  function renderItem({ item }: { item: AttorneyChatRoom }) {
    const claim = item.assessment?.claimType ? formatClaimType(item.assessment.claimType) : 'Case'
    const name = item.plaintiff?.name || 'Plaintiff'
    const preview = item.lastMessage?.content || 'No messages yet'
    const unread = item.unreadCount || 0

    return (
      <TouchableOpacity style={styles.card} onPress={() => openRoom(item)} activeOpacity={0.88}>
        <View style={styles.cardTop}>
          <Text style={styles.name}>{name}</Text>
          {unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.claim}>{claim}</Text>
        <Text style={styles.preview} numberOfLines={2}>
          {preview}
        </Text>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return <ScreenState title="Loading messages" message="Fetching your latest plaintiff conversations." loading />
  }

  if (loadError && rooms.length === 0) {
    return (
      <ScreenState
        title="Unable to load messages"
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
    <View style={styles.container}>
      {loadError ? (
        <InlineErrorBanner
          message={loadError}
          onAction={() => {
            setRefreshing(true)
            void load()
          }}
        />
      ) : null}
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, rooms.length === 0 && styles.listEmpty]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySub}>
              When plaintiffs message you on a case, threads appear here. You will get a push notification for new messages.
            </Text>
          </View>
        }
      />
    </View>
  )
}

function PlaintiffMessagesScreen() {
  const [rooms, setRooms] = useState<PlaintiffChatRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [summary, setSummary] = useState<{
    claimType?: string | null
    documentRequests: PlaintiffDocumentRequestRow[]
  } | null>(null)
  const stageSummary = useMemo(
    () => buildPlaintiffCaseStageSummary({ documentRequests: summary?.documentRequests || [] }),
    [summary?.documentRequests]
  )

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      const [data, dashboard] = await Promise.all([getPlaintiffChatRooms(), getPlaintiffCaseDashboard()])
      setRooms(Array.isArray(data) ? data : [])

      const activeCase = dashboard?.cases?.[0]
      if (!activeCase?.id) {
        setSummary(null)
        return
      }

      const requestData = await getPlaintiffDocumentRequests(activeCase.id).catch(
        () => ({ requests: [] as PlaintiffDocumentRequestRow[] })
      )
      setSummary({
        claimType: activeCase.claimType,
        documentRequests: requestData.requests || [],
      })
    } catch (err: unknown) {
      setRooms([])
      setSummary(null)
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
    return <ScreenState title="Loading messages" message="Fetching your attorney conversations." loading />
  }

  if (loadError && rooms.length === 0) {
    return (
      <ScreenState
        title="Unable to load messages"
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
    <View style={styles.container}>
      {loadError ? (
        <InlineErrorBanner
          message={loadError}
          onAction={() => {
            setRefreshing(true)
            void load()
          }}
        />
      ) : null}
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const claim = item.assessment?.claimType ? formatClaimType(item.assessment.claimType) : 'Case'
          const name = item.attorney?.name || 'Your attorney'
          const preview = item.messages?.[0]?.content || 'Your attorney can message you here about the next case step.'
          const isUnread = item.messages?.[0]?.senderType === 'attorney' && !item.messages?.[0]?.isRead

          return (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/chat/${item.id}`)} activeOpacity={0.88}>
              <View style={styles.cardTop}>
                <Text style={styles.name}>{name}</Text>
                {isUnread ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Update</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.claim}>{claim}</Text>
              {summary ? (
                <View
                  style={[
                    styles.stagePill,
                    {
                      backgroundColor: stageSummary.background,
                      borderColor: stageSummary.border,
                    },
                  ]}
                >
                  <Ionicons name={stageSummary.icon} size={13} color={stageSummary.accent} />
                  <Text style={[styles.stagePillText, { color: stageSummary.accent }]}>{stageSummary.title}</Text>
                </View>
              ) : null}
              <Text style={styles.preview} numberOfLines={2}>
                {preview}
              </Text>
            </TouchableOpacity>
          )
        }}
        contentContainerStyle={[styles.list, rooms.length === 0 && !summary && styles.listEmpty]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} />
        }
        ListHeaderComponent={
          summary ? (
            <View style={styles.plaintiffSummaryCard}>
              <Text style={styles.plaintiffLabel}>Conversation focus</Text>
              <Text style={styles.plaintiffHeadline}>{summary.claimType ? formatClaimType(summary.claimType) : 'Your case'}</Text>
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
                  <Ionicons name={stageSummary.icon} size={14} color={stageSummary.accent} />
                  <Text style={[styles.plaintiffStageLabel, { color: stageSummary.accent }]}>{stageSummary.title}</Text>
                </View>
                <Text style={styles.plaintiffStageCopy}>{stageSummary.detail}</Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>No attorney updates yet</Text>
            <Text style={styles.emptySub}>
              Once your attorney shares an update about the next case step, messages will appear here and you can reply from mobile.
            </Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  list: { padding: space.lg, paddingBottom: space.xxl },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
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
  name: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 },
  badge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  claim: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  stagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: space.md,
    paddingHorizontal: space.sm,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  stagePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  preview: { fontSize: 15, color: colors.text, marginTop: 10, lineHeight: 21 },
  plaintiffSummaryCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: space.xl,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  plaintiffLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  plaintiffHeadline: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 6 },
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
  empty: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: space.md },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 21 },
})
