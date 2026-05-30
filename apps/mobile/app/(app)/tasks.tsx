import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { createCaseTask, getApiErrorMessage, getFilteredAttorneyLeads, getTasksSummary, type TaskSummaryItem } from '../../src/lib/api'
import { InlineErrorBanner } from '../../src/components/InlineErrorBanner'
import { ScreenState } from '../../src/components/ScreenState'
import { colors, radii, space, shadows } from '../../src/theme/tokens'
import { formatClaimType, parseFacts } from '../../src/lib/formatLead'

type Section = { title: string; data: TaskSummaryItem[] }
const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const

function leadLabel(lead: any) {
  const assessment = lead?.assessment || {}
  const facts = parseFacts(assessment.facts)
  const plaintiffContext = facts?.plaintiffContext || facts?.plaintiff || {}
  const plaintiff = assessment.user
    ? `${assessment.user.firstName || ''} ${assessment.user.lastName || ''}`.trim()
    : lead?.plaintiffName ||
      `${plaintiffContext.firstName || ''} ${plaintiffContext.lastName || ''}`.trim() ||
      plaintiffContext.name
  return plaintiff || formatClaimType(assessment.claimType) || `Case ${String(lead?.id || '').slice(-6)}`
}

function leadMeta(lead: any) {
  const assessment = lead?.assessment || {}
  const claim = formatClaimType(assessment.claimType)
  const venue = [assessment.venueCounty, assessment.venueState].filter(Boolean).join(', ')
  return [claim, venue].filter(Boolean).join(' · ')
}

export default function TasksScreen() {
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [leadPickerOpen, setLeadPickerOpen] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>('medium')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const s = await getTasksSummary()
      const next: Section[] = []
      if (s.overdue?.length) next.push({ title: 'Overdue', data: s.overdue })
      if (s.today?.length) next.push({ title: 'Due today', data: s.today })
      if (s.upcoming?.length) next.push({ title: 'Upcoming', data: s.upcoming })
      if (s.noDueDate?.length) next.push({ title: 'No due date', data: s.noDueDate })
      setSections(next)
    } catch (err: unknown) {
      setSections([])
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

  function formatDue(iso: string | null) {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const loadLeads = useCallback(async () => {
    try {
      const response = await getFilteredAttorneyLeads({ sortBy: 'newest' })
      const rows = Array.isArray(response?.leads) ? response.leads : Array.isArray(response) ? response : []
      const activeRows = rows.filter((row: any) => !['rejected', 'declined', 'closed'].includes(String(row?.status || '').toLowerCase()))
      setLeads(activeRows)
      if (!selectedLead && activeRows[0]) setSelectedLead(activeRows[0])
    } catch (err: unknown) {
      setCreateError(getApiErrorMessage(err))
    }
  }, [selectedLead])

  async function openCreateTask() {
    setCreateError(null)
    setCreateOpen(true)
    await loadLeads()
  }

  async function submitTask() {
    if (!selectedLead?.id || !taskTitle.trim() || saving) return
    setSaving(true)
    setCreateError(null)
    try {
      await createCaseTask(selectedLead.id, {
        title: taskTitle.trim(),
        dueDate: dueDate.trim() || undefined,
        priority,
        notes: notes.trim() || undefined,
        taskType: 'mobile',
      })
      setTaskTitle('')
      setDueDate('')
      setPriority('medium')
      setNotes('')
      setCreateOpen(false)
      await load()
    } catch (err: unknown) {
      setCreateError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <ScreenState title="Loading tasks" message="Checking your case deadlines." loading />
  }

  return (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={sections.length === 0 ? styles.emptyContainer : styles.list}
        ListHeaderComponent={
          <View>
            <TouchableOpacity style={styles.createButton} onPress={() => { void openCreateTask() }} activeOpacity={0.85}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create task</Text>
            </TouchableOpacity>
            {loadError ? <InlineErrorBanner message={loadError} onAction={() => { setLoading(true); load() }} /> : null}
          </View>
        }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />
      }
      renderSectionHeader={({ section: { title } }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(`/(app)/lead/${item.leadId}`)}
          activeOpacity={0.88}
        >
          <Text style={styles.taskTitle}>{item.title}</Text>
          <Text style={styles.meta}>
            {item.claimType ? formatClaimType(item.claimType) : 'Case'} · Due {formatDue(item.dueDate)}
          </Text>
          <View style={styles.row}>
            <Text style={styles.openCase}>Open case</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="checkbox-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyTitle}>No open tasks</Text>
          <Text style={styles.emptySub}>Tasks created on your cases will show due dates here.</Text>
        </View>
      }
      />
      <Modal visible={createOpen} animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create task</Text>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setCreateOpen(false)} activeOpacity={0.75}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.form}>
            {createError ? <InlineErrorBanner message={createError} onAction={() => setCreateError(null)} actionLabel="Dismiss" /> : null}
            <Text style={styles.label}>Case</Text>
            <TouchableOpacity style={styles.caseSelector} onPress={() => setLeadPickerOpen(true)} activeOpacity={0.85}>
              <View style={styles.caseSelectorCopy}>
                <Text style={styles.caseName}>{selectedLead ? leadLabel(selectedLead) : 'Select a case'}</Text>
                {selectedLead ? <Text style={styles.caseMeta}>{leadMeta(selectedLead)}</Text> : null}
              </View>
              <Ionicons name="chevron-down" size={20} color={colors.primary} />
            </TouchableOpacity>

            <Text style={[styles.label, styles.fieldGap]}>Task title</Text>
            <TextInput
              style={styles.input}
              value={taskTitle}
              onChangeText={setTaskTitle}
              placeholder="Example: Call plaintiff about records"
              placeholderTextColor={colors.muted}
            />

            <Text style={[styles.label, styles.fieldGap]}>Due date</Text>
            <TextInput
              style={styles.input}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
            />

            <Text style={[styles.label, styles.fieldGap]}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.priorityPill, priority === item && styles.priorityPillOn]}
                  onPress={() => setPriority(item)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.priorityText, priority === item && styles.priorityTextOn]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, styles.fieldGap]}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional task details"
              placeholderTextColor={colors.muted}
              multiline
            />

            <TouchableOpacity
              style={[styles.submitButton, (!selectedLead?.id || !taskTitle.trim() || saving) && styles.submitButtonOff]}
              onPress={submitTask}
              disabled={!selectedLead?.id || !taskTitle.trim() || saving}
              activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Create task</Text>}
            </TouchableOpacity>
          </View>

          <Modal visible={leadPickerOpen} animationType="slide" onRequestClose={() => setLeadPickerOpen(false)}>
            <View style={styles.modalScreen}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select a case</Text>
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setLeadPickerOpen(false)} activeOpacity={0.75}>
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
                      setSelectedLead(item)
                      setLeadPickerOpen(false)
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.leadTitle}>{leadLabel(item)}</Text>
                    <Text style={styles.leadMeta}>{leadMeta(item)}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </Modal>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  emptyContainer: { flexGrow: 1, padding: space.lg },
  createButton: {
    minHeight: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.sm,
    marginVertical: space.md,
    ...shadows.soft,
  },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  sectionHeader: { paddingTop: space.md, paddingBottom: space.sm, backgroundColor: colors.surface },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  taskTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { fontSize: 14, color: colors.textSecondary, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: space.md },
  openCase: { fontSize: 15, fontWeight: '700', color: colors.primary },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: space.md },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
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
  },
  form: { padding: space.lg },
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
    backgroundColor: colors.card,
  },
  caseSelectorCopy: { flex: 1 },
  caseName: { fontSize: 16, fontWeight: '800', color: colors.text },
  caseMeta: { marginTop: 3, fontSize: 13, color: colors.textSecondary },
  input: {
    marginTop: space.sm,
    minHeight: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.card,
  },
  priorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  priorityPill: {
    paddingHorizontal: space.md,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  priorityPillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  priorityText: { fontSize: 13, fontWeight: '800', color: colors.text, textTransform: 'capitalize' },
  priorityTextOn: { color: '#fff' },
  notesInput: {
    marginTop: space.sm,
    minHeight: 96,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    color: colors.text,
    fontSize: 15,
    textAlignVertical: 'top',
    backgroundColor: colors.card,
  },
  submitButton: {
    marginTop: space.lg,
    minHeight: 54,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonOff: { opacity: 0.55 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
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
})
