import { useCallback, useRef, useState } from 'react'
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
import {
  getDocumentRequests,
  markDocumentRequestViewed,
  nudgeDocumentRequest,
  type DocumentRequestRow,
  getApiErrorMessage,
} from '../../src/lib/api'
import { InlineErrorBanner } from '../../src/components/InlineErrorBanner'
import { ScreenState } from '../../src/components/ScreenState'
import { labelRequestedDoc } from '../../src/lib/docRequestLabels'
import { colors, radii, space, shadows } from '../../src/theme/tokens'
import { formatClaimType } from '../../src/lib/formatLead'

export default function DocumentRequestsScreen() {
  const [rows, setRows] = useState<DocumentRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [nudging, setNudging] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const markedViewed = useRef<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const data = await getDocumentRequests()
      setRows(Array.isArray(data) ? data : [])
      for (const r of data || []) {
        if (!r.attorneyViewedAt && !markedViewed.current.has(r.id)) {
          markedViewed.current.add(r.id)
          markDocumentRequestViewed(r.id).catch(() => {})
        }
      }
    } catch (err: unknown) {
      setRows([])
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

  async function onNudge(id: string) {
    setNudging(id)
    setActionMessage(null)
    try {
      await nudgeDocumentRequest(id)
      await load()
      setActionMessage({
        tone: 'success',
        text: 'Reminder sent. The plaintiff will receive an email with the upload link.',
      })
    } catch (err: unknown) {
      setActionMessage({
        tone: 'error',
        text: getApiErrorMessage(err),
      })
    } finally {
      setNudging(null)
    }
  }

  if (loading) {
    return <ScreenState title="Loading document requests" message="Checking what plaintiffs still need to upload." loading />
  }

  if (loadError && rows.length === 0) {
    return (
      <ScreenState
        title="Unable to load document requests"
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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />
      }
    >
      {actionMessage ? (
        <View
          style={[
            styles.notice,
            actionMessage.tone === 'success' ? styles.noticeSuccess : styles.noticeError,
          ]}
        >
          <View style={styles.noticeCopy}>
            <Ionicons
              name={actionMessage.tone === 'success' ? 'checkmark-circle-outline' : 'warning-outline'}
              size={18}
              color={actionMessage.tone === 'success' ? colors.success : colors.danger}
            />
            <Text style={styles.noticeText}>{actionMessage.text}</Text>
          </View>
          <TouchableOpacity onPress={() => setActionMessage(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.noticeAction}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {loadError ? <InlineErrorBanner message={loadError} onAction={() => { setLoading(true); void load() }} /> : null}
      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyTitle}>No document requests</Text>
          <Text style={styles.emptySub}>
            Requests you send from the web app appear here. Mark viewed and send reminders when plaintiffs are slow to upload.
          </Text>
        </View>
      ) : (
        rows.map((r) => {
          const pending = r.status === 'pending' || r.status === 'partial'
          const claim = r.claimType ? formatClaimType(r.claimType) : 'Case'
          return (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.claim}>{claim}</Text>
                <View style={[styles.statusPill, pending ? styles.statusOpen : styles.statusDone]}>
                  <Text style={styles.statusText}>{r.status}</Text>
                </View>
              </View>
              <Text style={styles.docsTitle}>Requested</Text>
              {(r.requestedDocs || []).length === 0 ? (
                <Text style={styles.docLine}>General upload (see link)</Text>
              ) : (
                r.requestedDocs.map((k) => (
                  <Text key={k} style={styles.docLine}>
                    • {labelRequestedDoc(k)}
                  </Text>
                ))
              )}
              {r.customMessage ? <Text style={styles.note}>{r.customMessage}</Text> : null}
              <TouchableOpacity style={styles.leadBtn} onPress={() => router.push(`/(app)/lead/${r.leadId}`)}>
                <Text style={styles.leadBtnText}>Open case</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </TouchableOpacity>
              {pending ? (
                <TouchableOpacity
                  style={[styles.nudge, nudging === r.id && styles.nudgeOff]}
                  onPress={() => onNudge(r.id)}
                  disabled={nudging === r.id}
                >
                  <Ionicons name="mail-outline" size={18} color={colors.primary} />
                  <Text style={styles.nudgeText}>
                    {nudging === r.id ? 'Sending…' : 'Send reminder email'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )
        })
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space.lg, paddingBottom: space.xxl },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: space.md },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 21 },
  notice: {
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
  noticeAction: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm },
  claim: { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.sm },
  statusOpen: { backgroundColor: colors.warningMuted },
  statusDone: { backgroundColor: colors.successMuted },
  statusText: { fontSize: 12, fontWeight: '700', color: colors.text },
  docsTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: space.sm },
  docLine: { fontSize: 15, color: colors.text, marginTop: 4 },
  note: { fontSize: 14, color: colors.textSecondary, marginTop: space.md, fontStyle: 'italic' },
  leadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  leadBtnText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  nudge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    marginTop: space.md,
    paddingVertical: space.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary + '55',
    backgroundColor: colors.primary + '10',
  },
  nudgeOff: { opacity: 0.6 },
  nudgeText: { fontSize: 15, fontWeight: '700', color: colors.primary },
})
