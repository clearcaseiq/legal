import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { createDocumentRequest, getApiErrorMessage, getFilteredAttorneyLeads, getLeadCommandCenter, getLeadQuality } from '../../src/lib/api'
import { InlineErrorBanner } from '../../src/components/InlineErrorBanner'
import { ScreenState } from '../../src/components/ScreenState'
import { labelRequestedDoc } from '../../src/lib/docRequestLabels'
import { colors, radii, shadows, space } from '../../src/theme/tokens'
import { leadLabel, leadMeta } from '../../src/lib/formatLead'

const DOC_TYPES = ['police_report', 'medical_records', 'injury_photos', 'wage_loss', 'insurance', 'other']

function inferDocKey(label?: string) {
  const text = String(label || '').toLowerCase()
  if (text.includes('police')) return 'police_report'
  if (text.includes('medical') || text.includes('record') || text.includes('treatment')) return 'medical_records'
  if (text.includes('photo') || text.includes('injur')) return 'injury_photos'
  if (text.includes('wage') || text.includes('income') || text.includes('work')) return 'wage_loss'
  if (text.includes('insurance')) return 'insurance'
  return null
}

export default function RequestDocsScreen() {
  const { leadId } = useLocalSearchParams<{ leadId?: string }>()
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leadId || null)
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [leadPickerOpen, setLeadPickerOpen] = useState(false)
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentMessage, setSentMessage] = useState<string | null>(null)

  const disabled = useMemo(() => saving || !selectedLeadId || selectedDocs.length === 0, [selectedLeadId, saving, selectedDocs.length])

  const loadLeads = useCallback(async () => {
    try {
      const response = await getFilteredAttorneyLeads({ sortBy: 'newest' })
      const rows = Array.isArray(response?.leads) ? response.leads : Array.isArray(response) ? response : []
      const activeRows = rows.filter((row: any) => !['rejected', 'declined', 'closed'].includes(String(row?.status || '').toLowerCase()))
      setLeads(activeRows)
      if (selectedLeadId) {
        setSelectedLead(activeRows.find((row: any) => row.id === selectedLeadId) || null)
      } else if (activeRows[0]?.id) {
        setSelectedLeadId(activeRows[0].id)
        setSelectedLead(activeRows[0])
      } else {
        setLoading(false)
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
      setLoading(false)
    }
  }, [selectedLeadId])

  const loadSuggestion = useCallback(async () => {
    if (!selectedLeadId) return
    setError(null)
    try {
      const commandCenter = await getLeadCommandCenter(selectedLeadId).catch(() => null)
      const suggestion = commandCenter?.suggestedDocumentRequest
      if (Array.isArray(suggestion?.requestedDocs) && suggestion.requestedDocs.length > 0) {
        setSelectedDocs(suggestion.requestedDocs.filter((doc: string) => DOC_TYPES.includes(doc)))
        if (suggestion.customMessage) setMessage(suggestion.customMessage)
        return
      }

      const quality = await getLeadQuality(selectedLeadId).catch(() => null)
      const inferred = (quality?.missingItems || [])
        .map((item) => inferDocKey(item.label))
        .filter(Boolean) as string[]
      const unique = Array.from(new Set(inferred))
      setSelectedDocs(unique.length > 0 ? unique : ['medical_records'])
      setMessage('Please upload the selected documents so we can continue reviewing and preparing your case.')
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [selectedLeadId])

  useEffect(() => {
    void loadLeads()
  }, [loadLeads])

  useEffect(() => {
    setSelectedDocs([])
    setMessage('')
    setSentMessage(null)
    if (selectedLeadId) setLoading(true)
    void loadSuggestion()
  }, [selectedLeadId, loadSuggestion])

  function toggleDoc(doc: string) {
    setSentMessage(null)
    setSelectedDocs((current) =>
      current.includes(doc) ? current.filter((item) => item !== doc) : [...current, doc]
    )
  }

  async function submit() {
    if (!selectedLeadId || disabled) return
    setSaving(true)
    setError(null)
    setSentMessage(null)
    try {
      await createDocumentRequest(selectedLeadId, {
        requestedDocs: selectedDocs,
        customMessage: message.trim() || undefined,
      })
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {}
      setSentMessage(`Request sent for ${selectedDocs.length} document${selectedDocs.length === 1 ? '' : 's'}. The plaintiff will get the upload link.`)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <ScreenState title="Preparing request" message="Looking for the most useful missing documents." loading />
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Smart document request</Text>
        <Text style={styles.subtitle}>We preselected documents based on the case gaps. Adjust before sending.</Text>

        {error ? <InlineErrorBanner message={error} onAction={() => setError(null)} actionLabel="Dismiss" /> : null}
        {sentMessage ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
            <Text style={styles.successText}>{sentMessage}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.label}>Case</Text>
          <TouchableOpacity style={styles.caseSelector} onPress={() => setLeadPickerOpen(true)} activeOpacity={0.85}>
            <View style={styles.caseSelectorCopy}>
              <Text style={styles.caseName}>{selectedLead ? leadLabel(selectedLead) : 'Select a case'}</Text>
              {selectedLead ? <Text style={styles.caseMeta}>{leadMeta(selectedLead, { includeId: true })}</Text> : null}
            </View>
            <Ionicons name="chevron-down" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Requested documents</Text>
          <View style={styles.docGrid}>
            {DOC_TYPES.map((doc) => {
              const selected = selectedDocs.includes(doc)
              return (
                <TouchableOpacity
                  key={doc}
                  style={[styles.docPill, selected && styles.docPillOn]}
                  onPress={() => toggleDoc(doc)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={selected ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.docText, selected && styles.docTextOn]}>{labelRequestedDoc(doc)}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={[styles.label, styles.fieldGap]}>Message to plaintiff</Text>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            multiline
            placeholder="Optional message explaining what to upload and why."
            placeholderTextColor={colors.muted}
          />
        </View>

        <TouchableOpacity style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]} onPress={submit} disabled={disabled}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{sentMessage ? 'Send another request' : 'Send document request'}</Text>}
        </TouchableOpacity>
        {sentMessage ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/(app)/document-requests')} activeOpacity={0.85}>
            <Text style={styles.secondaryButtonText}>View all requests</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
      <Modal visible={leadPickerOpen} animationType="slide" onRequestClose={() => setLeadPickerOpen(false)}>
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select a case</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setLeadPickerOpen(false)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Close case selector"
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={leads}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.leadRow}
                onPress={() => {
                  setSelectedLeadId(item.id)
                  setSelectedLead(item)
                  setLeadPickerOpen(false)
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.leadTitle}>{leadLabel(item)}</Text>
                <Text style={styles.leadMeta}>{leadMeta(item, { includeId: true })}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No active cases</Text>
                <Text style={styles.emptySub}>Accept or add a case before requesting documents.</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space.lg, paddingBottom: space.xxl },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  subtitle: { marginTop: 6, marginBottom: space.lg, fontSize: 15, lineHeight: 22, color: colors.textSecondary },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.lg,
    ...shadows.card,
  },
  successBanner: {
    marginBottom: space.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.success + '55',
    backgroundColor: colors.successMuted,
    padding: space.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  successText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldGap: { marginTop: space.lg },
  caseSelector: {
    marginTop: space.sm,
    minHeight: 56,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
  },
  caseSelectorCopy: { flex: 1 },
  caseName: { fontSize: 16, fontWeight: '800', color: colors.text },
  caseMeta: { marginTop: 3, fontSize: 13, color: colors.textSecondary },
  docGrid: { gap: space.sm, marginTop: space.md },
  docPill: {
    minHeight: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  docPillOn: { borderColor: colors.primary + '55', backgroundColor: colors.primary + '10' },
  docText: { fontSize: 15, fontWeight: '700', color: colors.text },
  docTextOn: { color: colors.primaryDark },
  messageInput: {
    marginTop: space.sm,
    minHeight: 120,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'top',
    backgroundColor: colors.surface,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: { opacity: 0.55 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryButton: {
    marginTop: space.md,
    minHeight: 50,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  modalScreen: { flex: 1, backgroundColor: colors.surface },
  modalHeader: {
    padding: space.lg,
    paddingTop: space.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    zIndex: 2,
  },
  modalList: { padding: space.lg },
  leadRow: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  leadTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  leadMeta: { marginTop: 4, color: colors.textSecondary },
  empty: { padding: space.xxl, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  emptySub: { marginTop: 6, textAlign: 'center', color: colors.textSecondary, lineHeight: 20 },
})
