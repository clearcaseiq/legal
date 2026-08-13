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
  ScrollView,
  Image,
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
  markChatRead,
  toAbsoluteApiUrl,
  type ChatParticipants,
} from '../../../src/lib/api'
import { runOrQueue } from '../../../src/lib/offlineQueue'
import { useAuth } from '../../../src/contexts/AuthContext'
import { useAttorneyDashboardData } from '../../../src/contexts/AttorneyDashboardContext'
import { InlineErrorBanner } from '../../../src/components/InlineErrorBanner'
import { ScreenState } from '../../../src/components/ScreenState'
import { getAllQuickReplies, saveCustomQuickReply, type QuickReply } from '../../../src/lib/quickReplies'
import { colors, radii, space, shadows } from '../../../src/theme/tokens'

const CHAT_MESSAGE_MAX_LENGTH = 2000

type Msg = {
  id: string
  content: string
  contentTranslated?: string | null
  senderType: string
  createdAt: string
  pending?: boolean
}

const POLL_INTERVAL_MS = 8000

/** Merge fresh server rows with any still-pending optimistic messages. */
function mergeMessages(serverRows: Msg[], prev: Msg[]): Msg[] {
  const pendingTemps = prev.filter((m) => m.pending)
  if (pendingTemps.length === 0) return serverRows
  const serverKeys = new Set(serverRows.map((r) => `${r.senderType}|${r.content}`))
  const keptTemps = pendingTemps.filter((t) => !serverKeys.has(`${t.senderType}|${t.content}`))
  return [...serverRows, ...keptTemps]
}

export default function ChatThreadScreen() {
  const { user } = useAuth()
  const isAttorney = user?.role !== 'plaintiff'
  const { roomId, draft: draftParam } = useLocalSearchParams<{ roomId: string; draft?: string }>()
  const insets = useSafeAreaInsets()
  const { refresh: refreshDashboard } = useAttorneyDashboardData()
  const [messages, setMessages] = useState<Msg[]>([])
  const [participants, setParticipants] = useState<ChatParticipants | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState(typeof draftParam === 'string' ? draftParam : '')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [savedHint, setSavedHint] = useState(false)
  const listRef = useRef<FlatList>(null)

  const myAvatarUri = (() => {
    const raw = isAttorney
      ? participants?.attorney?.photoUrl
      : participants?.plaintiff?.avatar || user?.avatar
    return raw ? toAbsoluteApiUrl(raw) : null
  })()
  const theirAvatarUri = (() => {
    const raw = isAttorney
      ? participants?.plaintiff?.avatar
      : participants?.attorney?.photoUrl
    return raw ? toAbsoluteApiUrl(raw) : null
  })()
  const theirName = isAttorney
    ? participants?.plaintiff?.name || 'Client'
    : participants?.attorney?.name || 'Attorney'

  useEffect(() => {
    if (!isAttorney) return
    void getAllQuickReplies().then(setQuickReplies)
  }, [isAttorney])

  const onSaveQuickReply = useCallback(async () => {
    const body = draft.trim()
    if (!body) return
    await saveCustomQuickReply(body.slice(0, 24), body)
    setQuickReplies(await getAllQuickReplies())
    setSavedHint(true)
    setTimeout(() => setSavedHint(false), 1800)
  }, [draft])

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!roomId) return
    const silent = opts?.silent === true
    try {
      if (!silent) setLoadError(null)
      const { messages: rows, participants: nextParticipants } = isAttorney
        ? await getChatMessages(roomId)
        : await getPlaintiffChatMessages(roomId)
      if (nextParticipants) setParticipants(nextParticipants)
      const serverRows = Array.isArray(rows) ? (rows as Msg[]) : []
      setMessages((prev) => mergeMessages(serverRows, prev))
      // Marking read + dashboard refresh only on explicit (non-poll) loads to avoid churn.
      if (!silent) {
        if (isAttorney) {
          await markChatRead(roomId)
          await refreshDashboard({ force: true, silent: true })
        } else {
          await markPlaintiffChatRead(roomId)
        }
      }
    } catch (err: unknown) {
      if (!silent) setLoadError(getApiErrorMessage(err))
    } finally {
      if (!silent) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [isAttorney, refreshDashboard, roomId])

  useFocusEffect(
    useCallback(() => {
      void load()
      const timer = setInterval(() => {
        void load({ silent: true })
      }, POLL_INTERVAL_MS)
      return () => clearInterval(timer)
    }, [load])
  )

  async function onSend() {
    const text = draft.trim()
    if (!text || !roomId || sending) return
    setSending(true)
    setDraft('')
    // Optimistic message so the sender sees it immediately.
    const tempId = `temp-${Date.now()}`
    const optimistic: Msg = {
      id: tempId,
      content: text,
      senderType: isAttorney ? 'attorney' : 'user',
      createdAt: new Date().toISOString(),
      pending: true,
    }
    setMessages((prev) => [...prev, optimistic])
    try {
      const { queued } = await runOrQueue(
        isAttorney
          ? { type: 'attorney_message', payload: { chatRoomId: roomId, content: text } }
          : { type: 'plaintiff_message', payload: { chatRoomId: roomId, content: text } }
      )
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {
        /* no-op */
      }
      if (queued) {
        // Offline: keep the optimistic bubble; it will sync when back online.
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: true } : m)))
      } else {
        if (isAttorney) await refreshDashboard({ force: true, silent: true })
        await load({ silent: true })
      }
    } catch {
      // Real failure (not connectivity): roll back and restore the draft.
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
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
          const translated =
            !mine &&
            typeof item.contentTranslated === 'string' &&
            item.contentTranslated.trim() &&
            item.contentTranslated.trim() !== item.content.trim()
              ? item.contentTranslated.trim()
              : null
          const avatarUri = mine ? myAvatarUri : theirAvatarUri
          const avatarName = mine
            ? isAttorney
              ? participants?.attorney?.name || 'You'
              : `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'You'
            : theirName
          return (
            <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowThem]}>
              {!mine ? <ChatFace uri={avatarUri} name={avatarName} /> : null}
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleThem]}>
                <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
                  {translated || item.content}
                </Text>
                {translated ? (
                  <>
                    <Text style={[styles.originalLabel, mine && styles.timeMine]}>Original</Text>
                    <Text style={[styles.originalText, mine && styles.timeMine]}>{item.content}</Text>
                  </>
                ) : null}
                <Text style={[styles.time, mine && styles.timeMine]}>
                  {item.pending
                    ? 'Sending…'
                    : new Date(item.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                </Text>
              </View>
              {mine ? <ChatFace uri={avatarUri} name={avatarName} /> : null}
            </View>
          )
        }}
      />
      {isAttorney ? (
        <View style={styles.quickRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickContent} keyboardShouldPersistTaps="handled">
            {draft.trim().length > 0 ? (
              <TouchableOpacity
                style={[styles.quickChip, styles.quickChipSave]}
                onPress={() => { void onSaveQuickReply() }}
                accessibilityRole="button"
                accessibilityLabel="Save current message as a quick reply"
              >
                <Ionicons name={savedHint ? 'checkmark' : 'bookmark-outline'} size={13} color={colors.primaryDark} />
                <Text style={styles.quickChipSaveText}>{savedHint ? 'Saved' : 'Save'}</Text>
              </TouchableOpacity>
            ) : null}
            {quickReplies.map((qr) => (
              <TouchableOpacity
                key={qr.id}
                style={styles.quickChip}
                onPress={() => setDraft(qr.body)}
                accessibilityRole="button"
                accessibilityLabel={`Insert quick reply: ${qr.label}`}
              >
                <Text style={styles.quickChipText} numberOfLines={1}>{qr.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}
      <View style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder={isAttorney ? 'Message…' : 'Reply to your attorney…'}
            placeholderTextColor={colors.muted}
            value={draft}
            onChangeText={(text) => setDraft(text.slice(0, CHAT_MESSAGE_MAX_LENGTH))}
            multiline
            maxLength={CHAT_MESSAGE_MAX_LENGTH}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnOff]}
            onPress={onSend}
            disabled={!draft.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !draft.trim() || sending }}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        <Text
          style={[
            styles.charCount,
            draft.length >= CHAT_MESSAGE_MAX_LENGTH
              ? styles.charCountLimit
              : draft.length >= CHAT_MESSAGE_MAX_LENGTH * 0.9
                ? styles.charCountWarn
                : null,
          ]}
          accessibilityLiveRegion="polite"
        >
          {draft.length} / {CHAT_MESSAGE_MAX_LENGTH}
        </Text>
      </View>
    </KeyboardAvoidingView>
  )
}

function initials(name?: string | null) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function ChatFace({ uri, name }: { uri: string | null; name: string }) {
  if (uri) {
    return <Image source={{ uri }} style={styles.avatar} />
  }
  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarInitials}>{initials(name)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  bannerWrap: { paddingHorizontal: space.md, paddingTop: space.sm },
  listPad: { paddingHorizontal: space.md, paddingVertical: space.sm },
  bubbleRow: { marginBottom: space.sm, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.nav },
  avatarInitials: { fontSize: 10, fontWeight: '800', color: '#fff' },
  bubble: {
    maxWidth: '78%',
    borderRadius: radii.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    ...shadows.soft,
  },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleThem: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontSize: 16, lineHeight: 22, color: colors.text },
  bubbleTextMine: { color: '#fff' },
  originalLabel: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  originalText: { marginTop: 2, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  time: { fontSize: 11, color: colors.textSecondary, marginTop: 6 },
  timeMine: { color: 'rgba(255,255,255,0.85)' },
  quickRow: {
    backgroundColor: colors.card,
  },
  quickContent: { paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: space.sm, gap: space.sm, alignItems: 'center' },
  quickChip: {
    maxWidth: 150,
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipText: { fontSize: 13, fontWeight: '700', color: colors.text },
  quickChipSave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '14',
    borderColor: colors.primary + '40',
  },
  quickChipSaveText: { fontSize: 13, fontWeight: '800', color: colors.primaryDark },
  composerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
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
  charCount: {
    marginTop: 6,
    textAlign: 'right',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    color: colors.textSecondary,
  },
  charCountWarn: { color: '#d97706', fontWeight: '700' },
  charCountLimit: { color: colors.danger, fontWeight: '800' },
})
