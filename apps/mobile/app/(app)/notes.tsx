import { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { createLeadNote, getApiErrorMessage, getLeadNotes, type CaseNote } from '../../src/lib/api'
import { InlineErrorBanner } from '../../src/components/InlineErrorBanner'
import { ScreenState } from '../../src/components/ScreenState'
import { colors, radii, space, shadows } from '../../src/theme/tokens'

const NOTE_TYPES = ['general', 'call', 'client_update', 'strategy'] as const

export default function NotesScreen() {
  const { leadId } = useLocalSearchParams<{ leadId?: string }>()
  const [rows, setRows] = useState<CaseNote[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState('')
  const [noteType, setNoteType] = useState<(typeof NOTE_TYPES)[number]>('general')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!leadId) return
    try {
      setLoadError(null)
      const data = await getLeadNotes(leadId)
      setRows(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      setRows([])
      setLoadError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [leadId])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load])
  )

  const composerDisabled = useMemo(() => !draft.trim() || saving || !leadId, [draft, saving, leadId])

  async function onSave() {
    if (!leadId || composerDisabled) return
    setSaving(true)
    setSaveError(null)
    try {
      await createLeadNote(leadId, { message: draft.trim(), noteType })
      setDraft('')
      setNoteType('general')
      await load()
    } catch (err: unknown) {
      setSaveError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (!leadId) {
    return <ScreenState title="Missing case" message="Open notes from a case to capture case-specific updates." icon="document-text-outline" />
  }

  if (loading) {
    return <ScreenState title="Loading notes" message="Pulling the latest notes for this case." loading />
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {loadError ? (
        <View style={styles.bannerWrap}>
          <InlineErrorBanner message={loadError} onAction={() => { setLoading(true); void load() }} />
        </View>
      ) : null}

      <View style={styles.composerCard}>
        <Text style={styles.composerTitle}>Quick add note</Text>
        <Text style={styles.composerSub}>Capture call notes, next steps, and case context while it is fresh.</Text>
        <View style={styles.chips}>
          {NOTE_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.chip, noteType === type && styles.chipOn]}
              onPress={() => setNoteType(type)}
            >
              <Text style={[styles.chipText, noteType === type && styles.chipTextOn]}>
                {type.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          multiline
          placeholder="Type a note after a call, meeting, or review..."
          placeholderTextColor={colors.muted}
        />
        {saveError ? <InlineErrorBanner message={saveError} actionLabel="Dismiss" onAction={() => setSaveError(null)} /> : null}
        <TouchableOpacity style={[styles.saveBtn, composerDisabled && styles.saveBtnOff]} onPress={onSave} disabled={composerDisabled}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save note</Text>}
        </TouchableOpacity>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={rows.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardType}>{(item.noteType || 'general').replace(/_/g, ' ')}</Text>
              <Text style={styles.cardDate}>
                {new Date(item.createdAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <Text style={styles.message}>{item.message}</Text>
            {(item.authorName || item.authorEmail) ? (
              <Text style={styles.author}>By {item.authorName || item.authorEmail}</Text>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="create-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>No notes yet</Text>
            <Text style={styles.emptySub}>Use the quick add note box above to capture case context from your phone.</Text>
          </View>
        }
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  bannerWrap: { paddingHorizontal: space.lg, paddingTop: space.md },
  composerCard: {
    margin: space.lg,
    marginBottom: space.md,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  composerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  composerSub: { fontSize: 14, color: colors.textSecondary, marginTop: 6, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md, marginBottom: space.md },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.primary + '40', backgroundColor: colors.primary + '10' },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'capitalize' },
  chipTextOn: { color: colors.primaryDark },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: space.md,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
  },
  saveBtn: {
    marginTop: space.md,
    minHeight: 46,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  saveBtnOff: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  emptyContainer: { flexGrow: 1, paddingHorizontal: space.lg, paddingBottom: space.xxl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, marginBottom: space.sm },
  cardType: { fontSize: 12, fontWeight: '800', color: colors.primaryDark, textTransform: 'uppercase', letterSpacing: 0.6 },
  cardDate: { fontSize: 12, color: colors.textSecondary },
  message: { fontSize: 15, lineHeight: 22, color: colors.text },
  author: { fontSize: 13, color: colors.textSecondary, marginTop: space.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: space.md },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 21 },
})
