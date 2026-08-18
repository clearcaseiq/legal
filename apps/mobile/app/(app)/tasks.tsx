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
import {
  createCaseTask,
  getApiErrorMessage,
  getFilteredAttorneyLeads,
  getLeadTasks,
  getTasksSummary,
  updateCaseTask,
  type TaskSummaryItem,
} from '../../src/lib/api'
import { InlineErrorBanner } from '../../src/components/InlineErrorBanner'
import { ScreenState } from '../../src/components/ScreenState'
import { DomainBreadcrumb } from '../../src/components/DomainBreadcrumb'
import { colors, radii, space, shadows } from '../../src/theme/tokens'
import { formatClaimType, leadLabel, leadMeta } from '../../src/lib/formatLead'
import {
  bucketCaseTasks,
  describeStageUnlock,
  isAiTask,
  subtaskProgress,
  toggleSubtaskDone,
} from '../../src/lib/caseTasks'
import { CalendarDatePicker, formatDateKeyLong, toDateKey } from '../../src/components/CalendarDatePicker'

type Section = { title: string; data: TaskSummaryItem[] }
const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const

/**
 * Who a new task is for. This has to be sent explicitly: a task with no role is
 * stored as firm-internal, and the plaintiff is never told about it (CP-430).
 */
type AssigneeChoice = 'attorney' | 'client'
const ASSIGNEES: { value: AssigneeChoice; label: string; hint: string }[] = [
  { value: 'attorney', label: 'My firm', hint: 'Stays internal to your team.' },
  { value: 'client', label: 'Client', hint: 'Sent to the plaintiff with an email and a notification.' },
]

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

/** Drop a completed task from the buckets, discarding any section left empty. */
function removeTaskFromSections(sections: Section[], taskId: string): Section[] {
  return sections
    .map((section) => ({ ...section, data: section.data.filter((task) => task.id !== taskId) }))
    .filter((section) => section.data.length > 0)
}

function patchTaskInSections(
  sections: Section[],
  taskId: string,
  patch: (task: TaskSummaryItem) => TaskSummaryItem
): Section[] {
  return sections.map((section) => ({
    ...section,
    data: section.data.map((task) => (task.id === taskId ? patch(task) : task)),
  }))
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
 *
 * The leading checkbox completes the task. It is deliberately a separate hit
 * target from the card body, which still opens the case: ticking something off
 * between meetings is the reason to reach for this screen on a phone, and it
 * should not cost a navigation.
 */
function TaskCard({
  item,
  busy,
  onComplete,
  onToggleSubtask,
}: {
  item: TaskSummaryItem
  busy: boolean
  onComplete: (item: TaskSummaryItem) => void
  onToggleSubtask: (item: TaskSummaryItem, subtaskId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const subtasks = item.subtasks ?? []
  const { remaining, total } = subtaskProgress(subtasks)

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => onComplete(item)}
          disabled={busy}
          activeOpacity={0.7}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: false, disabled: busy }}
          accessibilityLabel={`Mark "${item.title}" complete`}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="ellipse-outline" size={26} color={colors.muted} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cardBody}
          onPress={() => router.push(`/(app)/lead/${item.leadId}`)}
          activeOpacity={0.88}
        >
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
      </View>

      {total > 0 ? (
        <>
          <TouchableOpacity
            style={styles.checklistToggle}
            onPress={() => setExpanded((v) => !v)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Hide checklist' : `Show ${total} checklist items`}
          >
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
            <Text style={styles.checklistToggleText}>
              {remaining > 0 ? `${remaining} of ${total} still open` : `All ${total} done`}
            </Text>
          </TouchableOpacity>
          {expanded ? (
            <View style={styles.checklist}>
              {subtasks.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.checklistItem}
                  onPress={() => onToggleSubtask(item, s.id)}
                  disabled={busy}
                  activeOpacity={0.7}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: s.done, disabled: busy }}
                  accessibilityLabel={s.title}
                >
                  <Ionicons
                    name={s.done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={s.done ? colors.success : colors.muted}
                    style={styles.checklistIcon}
                  />
                  <Text style={[styles.checklistText, s.done && styles.checklistTextDone]}>{s.title}</Text>
                </TouchableOpacity>
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
  const [assignee, setAssignee] = useState<AssigneeChoice>('attorney')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ message: string; taskId: string; leadId: string } | null>(null)

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

  /**
   * Complete a task. The row is dropped straight away because these buckets hold
   * only open tasks — waiting for the round-trip would leave the tapped task
   * sitting there looking untouched. A failed write re-reads the list rather
   * than trying to restore the old one, so what is on screen is always what the
   * server actually has.
   */
  const completeTask = useCallback(
    async (item: TaskSummaryItem) => {
      if (busyTaskId) return
      setBusyTaskId(item.id)
      setNotice(null)
      setSections((current) => removeTaskFromSections(current, item.id))
      try {
        const updated = await updateCaseTask(item.leadId, item.id, { status: 'done' })
        setNotice({
          message: describeStageUnlock(updated.stageUnlock) ?? 'Task completed.',
          taskId: item.id,
          leadId: item.leadId,
        })
        // A stage unlock writes new tasks server-side, so the list is now stale.
        if (updated.stageUnlock) await load()
      } catch (err: unknown) {
        setLoadError(getApiErrorMessage(err))
        await load()
      } finally {
        setBusyTaskId(null)
      }
    },
    [busyTaskId, load]
  )

  const reopenTask = useCallback(
    async (taskId: string, leadId: string) => {
      setNotice(null)
      setBusyTaskId(taskId)
      try {
        await updateCaseTask(leadId, taskId, { status: 'open' })
      } catch (err: unknown) {
        setLoadError(getApiErrorMessage(err))
      } finally {
        setBusyTaskId(null)
        await load()
      }
    },
    [load]
  )

  /**
   * Tick one checklist item. The server replaces the whole `subtasks` array, so
   * the full list goes back with the single entry flipped.
   */
  const toggleSubtask = useCallback(
    async (item: TaskSummaryItem, subtaskId: string) => {
      if (busyTaskId) return
      const nextSubtasks = toggleSubtaskDone(item.subtasks, subtaskId)
      setBusyTaskId(item.id)
      setSections((current) =>
        patchTaskInSections(current, item.id, (task) => ({ ...task, subtasks: nextSubtasks }))
      )
      try {
        await updateCaseTask(item.leadId, item.id, { subtasks: nextSubtasks })
      } catch (err: unknown) {
        setLoadError(getApiErrorMessage(err))
        await load()
      } finally {
        setBusyTaskId(null)
      }
    },
    [busyTaskId, load]
  )

  function setQuickDate(daysFromNow: number) {
    const d = new Date()
    d.setDate(d.getDate() + daysFromNow)
    setDueDate(toDateKey(d))
  }

  // The server rejects a past due date, so the picker greys those days out
  // rather than letting the form be filled in and then refused (CP-479).
  const earliestDueDate = toDateKey(new Date())
  const dueDateValid =
    !dueDate.trim() ||
    (/^\d{4}-\d{2}-\d{2}$/.test(dueDate.trim()) && dueDate.trim() >= earliestDueDate)
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
        assignedRole: assignee,
      })
      setTaskTitle('')
      setDueDate('')
      setPriority('medium')
      setAssignee('attorney')
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
            {notice ? (
              <View style={styles.notice}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={styles.noticeText}>{notice.message}</Text>
                <TouchableOpacity
                  onPress={() => { void reopenTask(notice.taskId, notice.leadId) }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Undo completing this task"
                >
                  <Text style={styles.noticeAction}>Undo</Text>
                </TouchableOpacity>
              </View>
            ) : null}
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
        <TaskCard
          item={item}
          busy={busyTaskId === item.id}
          onComplete={(task) => { void completeTask(task) }}
          onToggleSubtask={(task, subtaskId) => { void toggleSubtask(task, subtaskId) }}
        />
      )}
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
                <Text style={styles.dateFieldHint}>
                  {dueDateValid ? 'Tap to open the calendar' : 'Pick today or a later date'}
                </Text>
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

            <Text style={[styles.label, styles.fieldGap]}>Assign to</Text>
            <View style={styles.assigneeRow}>
              {ASSIGNEES.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.assigneePill, assignee === item.value && styles.assigneePillOn]}
                  onPress={() => setAssignee(item.value)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ selected: assignee === item.value }}
                  accessibilityLabel={`Assign to ${item.label}. ${item.hint}`}
                >
                  <Text style={[styles.assigneeText, assignee === item.value && styles.assigneeTextOn]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.assigneeHint}>
              {ASSIGNEES.find((item) => item.value === assignee)?.hint}
            </Text>

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
            value={dueDate.trim() || earliestDueDate}
            minDate={earliestDueDate}
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
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  // 44pt of touchable width so the checkbox clears the case-opening body next to
  // it; the negative offsets keep the icon optically aligned with the title.
  checkbox: {
    width: 44,
    height: 44,
    marginTop: -space.sm,
    marginLeft: -space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  taskTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 6, flexWrap: 'wrap' },
  notice: {
    marginBottom: space.md,
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.successMuted,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  noticeText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  noticeAction: { fontSize: 14, fontWeight: '800', color: colors.primary, paddingVertical: space.sm },
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
  // Now tappable, so the row needs a real touch target rather than text height.
  checklistItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, minHeight: 40, paddingVertical: 6 },
  checklistIcon: { marginTop: 1 },
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
  assigneeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  assigneePill: {
    paddingHorizontal: space.md,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  assigneePillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  assigneeText: { fontSize: 13, fontWeight: '800', color: colors.text },
  assigneeTextOn: { color: '#fff' },
  assigneeHint: { marginTop: space.xs, fontSize: 12, color: colors.textSecondary },
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
