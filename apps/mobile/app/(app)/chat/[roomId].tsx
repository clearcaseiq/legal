import { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useFocusEffect } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  getApiErrorMessage,
  getChatMessages,
  getPlaintiffChatMessages,
  markPlaintiffChatRead,
  sendPlaintiffMessage,
  sendAttorneyMessage,
  markChatRead,
} from '../../../src/lib/api'
import { useAuth } from '../../../src/contexts/AuthContext'
import { useAttorneyDashboardData } from '../../../src/contexts/AttorneyDashboardContext'
import { InlineErrorBanner } from '../../../src/components/InlineErrorBanner'
import { ScreenState } from '../../../src/components/ScreenState'
import { colors, radii, space, shadows } from '../../../src/theme/tokens'

type Msg = {
  id: string
  content: string
  senderType: string
  createdAt: string
}

export default function ChatThreadScreen() {
  const { user } = useAuth()
  const isAttorney = user?.role !== 'plaintiff'
  const { roomId } = useLocalSearchParams<{ roomId: string }>()
  const insets = useSafeAreaInsets()
  const { refresh: refreshDashboard } = useAttorneyDashboardData()
  const [messages, setMessages] = useState<Msg[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const listRef = useRef<FlatList>(null)

  const load = useCallback(async () => {
    if (!roomId) return
    try {
      setLoadError(null)
      const rows = isAttorney ? await getChatMessages(roomId) : await getPlaintiffChatMessages(roomId)
      setMessages(Array.isArray(rows) ? rows : [])
      if (isAttorney) {
        await markChatRead(roomId)
        await refreshDashboard({ force: true, silent: true })
      } else {
        await markPlaintiffChatRead(roomId)
      }
    } catch (err: unknown) {
      if (messages.length === 0) {
        setMessages([])
      }
      setLoadError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [isAttorney, messages.length, refreshDashboard, roomId])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load])
  )

  async function onSend() {
    const text = draft.trim()
    if (!text || !roomId || sending) return
    setSending(true)
    setDraft('')
    try {
      if (isAttorney) {
        await sendAttorneyMessage(roomId, text)
        await refreshDashboard({ force: true, silent: true })
      } else {
        await sendPlaintiffMessage(roomId, text)
      }
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {
        /* no-op */
      }
      await load()
    } catch {
      setDraft(text)
    } finally {
      setSending(false)
    }
  }

  if (!roomId) {
    return (
      <ScreenState title="Invalid thread" message="This conversation link is missing or no longer available." icon="chatbubble-ellipses-outline" />
    )
  }

  if (loading) {
    return <ScreenState title="Loading conversation" message={isAttorney ? 'Fetching the latest messages for this plaintiff.' : 'Fetching the latest messages from your attorney.'} loading />
  }

  if (loadError && messages.length === 0) {
    return (
      <ScreenState
        title="Unable to load conversation"
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 56}
    >
      {loadError ? (
        <View style={styles.bannerWrap}>
          <InlineErrorBanner
            message={loadError}
            onAction={() => {
              setRefreshing(true)
              void load()
            }}
          />
        </View>
      ) : null}
      <FlatList
        ref={listRef}
        data={[...messages].reverse()}
        inverted
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listPad}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true)
          void load()
        }}
        renderItem={({ item }) => {
          const mine = isAttorney ? item.senderType === 'attorney' : item.senderType === 'user'
          return (
            <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowThem]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleThem]}>
                <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.content}</Text>
                <Text style={[styles.time, mine && styles.timeMine]}>
                  {new Date(item.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          )
        }}
      />
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <TextInput
          style={styles.input}
          placeholder={isAttorney ? 'Message…' : 'Reply to your attorney…'}
          placeholderTextColor={colors.muted}
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnOff]}
          onPress={onSend}
          disabled={!draft.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="send" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  bannerWrap: { paddingHorizontal: space.md, paddingTop: space.sm },
  listPad: { paddingHorizontal: space.md, paddingVertical: space.sm },
  bubbleRow: { marginBottom: space.sm, flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '88%',
    borderRadius: radii.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    ...shadows.soft,
  },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleThem: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontSize: 16, lineHeight: 22, color: colors.text },
  bubbleTextMine: { color: '#fff' },
  time: { fontSize: 11, color: colors.textSecondary, marginTop: 6 },
  timeMine: { color: 'rgba(255,255,255,0.85)' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { opacity: 0.45 },
})
