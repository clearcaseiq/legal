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
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { createCaseTask, getApiErrorMessage, getFilteredAttorneyLeads, getLeadTasks, getTasksSummary, type TaskSummaryItem } from '../../src/lib/api'
import { InlineErrorBanner } from '../../src/components/InlineErrorBanner'
import { ScreenState } from '../../src/components/ScreenState'
import { DomainBreadcrumb } from '../../src/components/DomainBreadcrumb'
import { colors, radii, space, shadows } from '../../src/theme/tokens'
import { formatClaimType, leadLabel, leadMeta } from '../../src/lib/formatLead'
import { bucketCaseTasks, isAiTask } from '../../src/lib/caseTasks'
import { CalendarDatePicker, formatDateKeyLong, toDateKey } from '../../src/components/CalendarDatePicker'

type Section = { title: string; data: TaskSummaryItem[] }
const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const

const PRIORITY_RANK: Record<string, number> = { urgent: 3, high: 2, medium: 1, low: 0 }

// Mirror the web workspace ordering: due date (soonest/overdue first, undated last),
// then priority, then title, so same-date tasks keep a stable, predictable order.
function sortTasksByDue(items: TaskSummaryItem[]): TaskSummaryItem[] {
  return [...items].sort((a, b) => {
    const at = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY
    const bt = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY
    if (at !== bt) return at - bt
    const ap = PRIORITY_RANK[String(a.priority || '').toLowerCase()] ?? -1
    const bp = PRIORITY_RANK[String(b.priority || '').toLowerCase()] ?? -1
    if (ap !== bp) return bp - ap
    return String(a.title || '').localeCompare(String(b.title || ''))
  })
}

function formatDue(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Marks a task Rose, the AI Case Manager, raised on her own. Wording matters
 * here: Rose spots the next step, but the task is assigned to a real person, so
 * the chip must not read as "Rose is handling it".
 */
function RoseBadge() {
  return (
    <View style={styles.roseBadge}>
      <Ionicons name="sparkles" size={11} color={colors.primaryDark} />
      <Text style={styles.roseBadgeText}>Rose</Text>
    </View>
  )
}

/**
 * One task in the list. Tasks that carry a checklist — chiefly the grouped
 * "Questions for the plaintiff" task — can expand it inline, since this app has
 * no task-detail screen to open and the titles alone would hide the questions.
 */
function TaskCard({ item }: { item: TaskSummaryItem }) {
  const [expanded, setExpanded] = useState(false)
  const subtasks = item.subtasks ?? []
  const remaining = subtasks.filter((s) => !s.done).length

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => router.push(`/(app)/lead/${item.leadId}`)} activeOpacity={0.88}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        <View style={styles.metaRow}>
          {isAiTask(item.taskType) ? <RoseBadge /> : null}
          <Text style={styles.meta}>
            {[item.claimType ? formatClaimType(item.claimType) : null, `Due ${formatDue(item.dueDate)}`]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </TouchableOpacity>

      {subtasks.length > 0 ? (
        <>
          <TouchableOpacity
            style={styles.checklistToggle}
            onPress={() => setExpanded((v) => !v)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Hide checklist' : `Show ${subtasks.length} checklist items`}
          >
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
            <Text style={styles.checklistToggleText}>
              {remaining > 0 ? `${remaining} of ${subtasks.length} still open` : `All ${subtasks.length} done`}
            </Text>
          </TouchableOpacity>
          {expanded ? (
            <View style={styles.checklist}>
              {subtasks.map((s) => (
                <View key={s.id} style={styles.checklistItem}>
                  <Ionicons
                    name={s.done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={s.done ? colors.success : colors.muted}
                    style={styles.checklistIcon}
                  />
                  <Text style={[styles.checklistText, s.done && styles.checklistTextDone]}>{s.title}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push(`/(app)/lead/${item.leadId}`)}
        activeOpacity={0.7}
      >
        <Text style={styles.openCase}>Open case</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </TouchableOpacity>
    </View>
  )
}

export default function TasksScreen() {
  // Opened from a case, this screen shows only that case's tasks; opened from
  // the tab bar it stays the cross-case queue (CP-428, CP-422).
  const { leadId, caseLabel } = useLocalSearchParams<{ leadId?: string; caseLabel?: string }>()
  const scopedLeadId = typeof leadId === 'string' && leadId ? leadId : null
  const scopedCaseLabel = typeof caseLabel === 'string' && caseLabel ? caseLabel : null

  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [leadPickerOpen, setLeadPickerOpen] = useState(false)
  const [duePickerOpen, setDuePickerOpen] = useState(false)
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
      const s = scopedLeadId
        ? bucketCaseTasks(await getLeadTasks(scopedLeadId), scopedLeadId)
        : await getTasksSummary()
      const next: Section[] = []
      if (s.overdue?.length) next.push({ title: 'Overdue', data: sortTasksByDue(s.overdue) })
      if (s.today?.length) next.push({ title: 'Due today', data: sortTasksByDue(s.today) })
      if (s.upcoming?.length) next.push({ title: 'Upcoming', data: sortTasksByDue(s.upcoming) })
      if (s.noDueDate?.length) next.push({ title: 'No due date', data: sortTasksByDue(s.noDueDate) })
      setSections(next)
    } catch (err: unknown) {
      setSections([])
      setLoadError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [scopedLeadId])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load])
  )

  function setQuickDate(daysFromNow: number) {
    const d = new Date()
    d.setDate(d.getDate() + daysFromNow)
    setDueDate(toDateKey(d))
  }

  const dueDateValid = !dueDate.trim() || /^\d{4}-\d{2}-\d{2}$/.test(dueDate.trim())
  // Format from the local calendar day so a date never renders one day early in
  // negative UTC offsets (`new Date('2026-07-15')` parses as UTC midnight).
  const dueDatePreview = dueDate.trim() ? formatDateKeyLong(dueDate.trim()) || null : null

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
    if (scopedLeadId) {
      // The case is fixed by the route, so skip the picker entirely. `leadLabel`
      // reads `plaintiffName`, which is what the case screen passed through.
      setSelectedLead({ id: scopedLeadId, plaintiffName: scopedCaseLabel })
      return
    }
    await loadLeads()
  }

  async function submitTask() {
    if (!selectedLead?.id || !taskTitle.trim() || saving || !dueDateValid) return
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
            <DomainBreadcrumb
              domain="casework"
              title={scopedLeadId ? (scopedCaseLabel ? `${scopedCaseLabel} · Tasks` : 'Case tasks') : 'Tasks'}
              style={styles.header}
            />
            {scopedLeadId ? (
              <TouchableOpacity
                style={styles.scopeBanner}
                onPress={() => router.replace('/(app)/tasks')}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Show tasks for all cases"
              >
                <Ionicons name="filter" size={16} color={colors.primaryDark} />
                <Text style={styles.scopeBannerText}>This case only</Text>
                <Text style={styles.scopeBannerAction}>View all cases</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => { void openCreateTask() }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Create task"
            >
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
      renderItem={({ item }) => <TaskCard item={item} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="checkbox-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyTitle}>No open tasks</Text>
          <Text style={styles.emptySub}>
            {scopedLeadId
              ? 'This case has no open tasks. Create one to track the next step.'
              : 'Tasks created on your cases will show due dates here.'}
          </Text>
        </View>
      }
      />
      <Modal visible={createOpen} animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create task</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setCreateOpen(false)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Close create task"
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.form}>
            {createError ? <InlineErrorBanner message={createError} onAction={() => setCreateError(null)} actionLabel="Dismiss" /> : null}
            <Text style={styles.label}>Case</Text>
            {scopedLeadId ? (
              <View style={[styles.caseSelector, styles.caseSelectorFixed]}>
                <View style={styles.caseSelectorCopy}>
                  <Text style={styles.caseName}>{scopedCaseLabel || 'This case'}</Text>
                  <Text style={styles.caseMeta}>Tasks you add here stay on this case</Text>
                </View>
                <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
              </View>
            ) : (
              <TouchableOpacity style={styles.caseSelector} onPress={() => setLeadPickerOpen(true)} activeOpacity={0.85}>
                <View style={styles.caseSelectorCopy}>
                  <Text style={styles.caseName}>{selectedLead ? leadLabel(selectedLead) : 'Select a case'}</Text>
                  {selectedLead ? <Text style={styles.caseMeta}>{leadMeta(selectedLead)}</Text> : null}
                </View>
                <Ionicons name="chevron-down" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}

            <Text style={[styles.label, styles.fieldGap]}>Task title</Text>
            <TextInput
              style={styles.input}
              value={taskTitle}
              onChangeText={setTaskTitle}
              placeholder="Example: Call plaintiff about records"
              placeholderTextColor={colors.muted}
            />

            <Text style={[styles.label, styles.fieldGap]}>Due date</Text>
            <View style={styles.quickDateRow}>
              {([
                { label: 'Today', days: 0 },
                { label: 'Tomorrow', days: 1 },
                { label: 'In 1 week', days: 7 },
              ] as const).map((option) => (
                <TouchableOpacity
                  key={option.label}
                  style={styles.quickDateChip}
                  onPress={() => setQuickDate(option.days)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`Set due date ${option.label}`}
                >
                  <Text style={styles.quickDateText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
              {dueDate.trim() ? (
                <TouchableOpacity
                  style={styles.quickDateChip}
                  onPress={() => setDueDate('')}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Clear due date"
                >
                  <Text style={styles.quickDateText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.dateField}
              onPress={() => setDuePickerOpen(true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={dueDate.trim() ? `Due date ${dueDatePreview || dueDate}. Tap to open the calendar.` : 'Pick a due date from the calendar'}
            >
              <View style={styles.dateFieldCopy}>
                <Text style={[styles.dateFieldValue, !dueDate.trim() && styles.dateFieldPlaceholder]}>
                  {dueDatePreview || 'No due date'}
                </Text>
                <Text style={styles.dateFieldHint}>Tap to open the calendar</Text>
              </View>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </TouchableOpacity>

            <Text style={[styles.label, styles.fieldGap]}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.priorityPill, priority === item && styles.priorityPillOn]}
                  onPress={() => setPriority(item)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ selected: priority === item }}
                  accessibilityLabel={`Priority ${item}`}
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
              style={[styles.submitButton, (!selectedLead?.id || !taskTitle.trim() || saving || !dueDateValid) && styles.submitButtonOff]}
              onPress={submitTask}
              disabled={!selectedLead?.id || !taskTitle.trim() || saving || !dueDateValid}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Create task"
              accessibilityState={{ disabled: !selectedLead?.id || !taskTitle.trim() || saving || !dueDateValid }}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Create task</Text>}
            </TouchableOpacity>
          </View>

          <CalendarDatePicker
            visible={duePickerOpen}
            value={dueDate.trim() || toDateKey(new Date())}
            onSelect={setDueDate}
            onClose={() => setDuePickerOpen(false)}
            title="Due date"
          />
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
  header: { marginTop: space.md },
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
  scopeBanner: {
    marginTop: space.md,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  scopeBannerText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  scopeBannerAction: { fontSize: 13, fontWeight: '800', color: colors.primary },
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
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 6, flexWrap: 'wrap' },
  meta: { fontSize: 14, color: colors.textSecondary },
  roseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  roseBadgeText: { fontSize: 11, fontWeight: '800', color: colors.primaryDark },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: space.md },
  openCase: { fontSize: 15, fontWeight: '700', color: colors.primary },
  checklistToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.sm, minHeight: 32 },
  checklistToggleText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  checklist: {
    marginTop: space.sm,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: space.sm,
  },
  checklistItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  checklistIcon: { marginTop: 2 },
  checklistText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
  checklistTextDone: { color: colors.textSecondary, textDecorationLine: 'line-through' },
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
  caseSelectorFixed: { backgroundColor: colors.surface },
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
  quickDateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  quickDateChip: {
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  quickDateText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  dateField: {
    marginTop: space.sm,
    minHeight: 58,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  dateFieldCopy: { flex: 1 },
  dateFieldValue: { fontSize: 16, fontWeight: '800', color: colors.text },
  dateFieldPlaceholder: { fontWeight: '600', color: colors.textSecondary },
  dateFieldHint: { marginTop: 2, fontSize: 12, color: colors.textSecondary },
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
