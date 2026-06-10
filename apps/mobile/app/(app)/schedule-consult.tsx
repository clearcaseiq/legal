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
import {
  getApiErrorMessage,
  getFilteredAttorneyLeads,
  getLeadDetails,
  scheduleConsultation,
  updateAttorneyAppointment,
} from '../../src/lib/api'
import { InlineErrorBanner } from '../../src/components/InlineErrorBanner'
import { ScreenState } from '../../src/components/ScreenState'
import { colors, radii, shadows, space } from '../../src/theme/tokens'
import { leadLabel, leadMeta } from '../../src/lib/formatLead'
import { addEventToCalendar } from '../../src/lib/addToCalendar'

const TIME_SLOTS = [
  '9:00 AM',
  '9:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '1:00 PM',
  '1:30 PM',
  '2:00 PM',
  '2:30 PM',
  '3:00 PM',
  '3:30 PM',
  '4:00 PM',
  '4:30 PM',
  '5:00 PM',
]

const MEETING_TYPES = [
  { id: 'phone', label: 'Phone' },
  { id: 'video', label: 'Video' },
  { id: 'in_person', label: 'In person' },
]

function tomorrowDate() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().slice(0, 10)
}

function addDays(dateText: string, delta: number) {
  const date = new Date(`${dateText}T12:00:00`)
  date.setDate(date.getDate() + delta)
  return date.toISOString().slice(0, 10)
}

function isSchedulableLead(lead: any) {
  const status = String(lead?.status || '').toLowerCase()
  const lifecycle = String(lead?.lifecycleState || '').toLowerCase()
  if (['rejected', 'declined', 'closed'].includes(status)) return false
  if (['routing_active', 'not_routable_yet'].includes(lifecycle)) return false
  return true
}

export default function ScheduleConsultScreen() {
  const { leadId, appointmentId, scheduledAt, currentType, currentNotes } = useLocalSearchParams<{
    leadId?: string
    appointmentId?: string
    scheduledAt?: string
    currentType?: string
    currentNotes?: string
  }>()
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leadId || null)
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [leadPickerOpen, setLeadPickerOpen] = useState(false)
  const [timePickerOpen, setTimePickerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState(() => scheduledAt ? new Date(scheduledAt).toISOString().slice(0, 10) : tomorrowDate())
  const [time, setTime] = useState(() => scheduledAt ? new Date(scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '2:00 PM')
  const [manualTime, setManualTime] = useState(time)
  const [meetingType, setMeetingType] = useState(currentType || 'phone')
  const [notes, setNotes] = useState(currentNotes || '')
  const [alsoAddToCalendar, setAlsoAddToCalendar] = useState(true)

  const selectedLeadName = useMemo(() => selectedLead ? leadLabel(selectedLead) : 'Select a case', [selectedLead])
  const selectedLeadMeta = useMemo(() => selectedLead ? leadMeta(selectedLead, { includeId: true }) : '', [selectedLead])

  const load = useCallback(async () => {
    setError(null)
    try {
      const leadListResponse = await getFilteredAttorneyLeads({ sortBy: 'newest' })
      const rows = Array.isArray(leadListResponse?.leads)
        ? leadListResponse.leads
        : Array.isArray(leadListResponse)
          ? leadListResponse
          : []
      const schedulableRows = rows.filter(isSchedulableLead)
      setLeads(schedulableRows)

      if (selectedLeadId) {
        const detail = await getLeadDetails(selectedLeadId)
        setSelectedLead(detail || schedulableRows.find((row: any) => row.id === selectedLeadId) || null)
      } else if (schedulableRows[0]?.id) {
        setSelectedLeadId(schedulableRows[0].id)
        setSelectedLead(schedulableRows[0])
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [selectedLeadId])

  useEffect(() => {
    void load()
  }, [load])

  async function submit() {
    if ((!selectedLeadId && !appointmentId) || saving) return
    setSaving(true)
    setError(null)
    try {
      if (appointmentId) {
        const scheduledDate = new Date(`${date} ${time}`)
        await updateAttorneyAppointment(appointmentId, {
          scheduledAt: Number.isNaN(scheduledDate.getTime()) ? undefined : scheduledDate.toISOString(),
          type: meetingType,
          notes: notes.trim() || undefined,
        })
      } else if (selectedLeadId) {
        await scheduleConsultation(selectedLeadId, {
          date,
          time,
          meetingType,
          notes: notes.trim() || undefined,
        })
      }
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {
        // Haptics are best-effort.
      }
      if (alsoAddToCalendar) {
        const scheduledDate = new Date(`${date} ${time}`)
        if (!Number.isNaN(scheduledDate.getTime())) {
          await addEventToCalendar({
            title: `Consultation — ${selectedLeadName}`,
            start: scheduledDate,
            end: new Date(scheduledDate.getTime() + 30 * 60_000),
            details: notes.trim() || `${meetingType} consultation (ClearCaseIQ)`,
          })
        }
      }
      router.replace('/(app)/(tabs)/calendar')
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <ScreenState title="Loading scheduler" message="Preparing your case list." loading />
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{appointmentId ? 'Reschedule event' : 'Create calendar event'}</Text>
        <Text style={styles.subtitle}>
          {appointmentId ? 'Update the consultation time, meeting type, or notes.' : 'Schedule a plaintiff consultation and add it to your case calendar.'}
        </Text>

        {error ? <InlineErrorBanner message={error} onAction={() => setError(null)} actionLabel="Dismiss" /> : null}

        <View style={styles.card}>
          <Text style={styles.label}>Case</Text>
          <TouchableOpacity style={styles.caseSelector} onPress={() => setLeadPickerOpen(true)} activeOpacity={0.85}>
            <View style={styles.caseSelectorCopy}>
              <Text style={styles.caseName}>{selectedLeadName}</Text>
              {selectedLeadMeta ? <Text style={styles.caseMeta}>{selectedLeadMeta}</Text> : null}
            </View>
            <Ionicons name="chevron-down" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Date</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.smallButton} onPress={() => setDate(addDays(date, -1))}>
              <Ionicons name="chevron-back" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TextInput
              style={styles.dateInput}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
            />
            <TouchableOpacity style={styles.smallButton} onPress={() => setDate(addDays(date, 1))}>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, styles.fieldGap]}>Time</Text>
          <TouchableOpacity style={styles.timeSelector} onPress={() => setTimePickerOpen(true)} activeOpacity={0.85}>
            <View>
              <Text style={styles.timeSelectorValue}>{time}</Text>
              <Text style={styles.timeSelectorHint}>Tap to choose an appointment time</Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={colors.primary} />
          </TouchableOpacity>

          <Text style={[styles.label, styles.fieldGap]}>Meeting type</Text>
          <View style={styles.optionWrap}>
            {MEETING_TYPES.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.optionPill, meetingType === item.id && styles.optionPillActive]}
                onPress={() => setMeetingType(item.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.optionText, meetingType === item.id && styles.optionTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, styles.fieldGap]}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes for the consultation"
            placeholderTextColor={colors.muted}
            multiline
          />
        </View>

        <TouchableOpacity
          style={styles.calCheckRow}
          onPress={() => setAlsoAddToCalendar((v) => !v)}
          activeOpacity={0.8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: alsoAddToCalendar }}
          accessibilityLabel="Also add this consultation to my phone calendar"
        >
          <Ionicons
            name={alsoAddToCalendar ? 'checkbox' : 'square-outline'}
            size={22}
            color={alsoAddToCalendar ? colors.primary : colors.muted}
          />
          <Text style={styles.calCheckText}>Also add to my calendar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, ((!selectedLeadId && !appointmentId) || saving) && styles.primaryButtonDisabled]}
          onPress={submit}
          disabled={(!selectedLeadId && !appointmentId) || saving}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{appointmentId ? 'Save changes' : 'Schedule consultation'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace('/(app)/(tabs)')}
          activeOpacity={0.85}
        >
          <Ionicons name="home-outline" size={18} color={colors.primary} />
          <Text style={styles.secondaryButtonText}>Back to dashboard</Text>
        </TouchableOpacity>
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
                <Text style={styles.emptySub}>Accept or add a case before scheduling a consultation.</Text>
              </View>
            }
          />
        </View>
      </Modal>
      <Modal visible={timePickerOpen} animationType="slide" onRequestClose={() => setTimePickerOpen(false)}>
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select time</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setTimePickerOpen(false)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Close time selector"
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.manualTimeCard}>
            <Text style={styles.label}>Manual time</Text>
            <View style={styles.manualTimeRow}>
              <TextInput
                style={styles.manualTimeInput}
                value={manualTime}
                onChangeText={setManualTime}
                placeholder="Example: 6:15 PM"
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.manualTimeButton}
                onPress={() => {
                  const nextTime = manualTime.trim()
                  if (nextTime) {
                    setTime(nextTime)
                    setTimePickerOpen(false)
                  }
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.manualTimeButtonText}>Use</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.manualTimeHint}>Use formats like 8:45 AM, 12:15 PM, or 6 PM.</Text>
          </View>
          <FlatList
            data={TIME_SLOTS}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.timeRow, time === item && styles.timeRowSelected]}
                onPress={() => {
                  setTime(item)
                  setManualTime(item)
                  setTimePickerOpen(false)
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.timeRowText, time === item && styles.timeRowTextSelected]}>{item}</Text>
                {time === item ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
              </TouchableOpacity>
            )}
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
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  smallButton: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  dateInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    color: colors.text,
    fontSize: 16,
    backgroundColor: colors.surface,
  },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  timeSelector: {
    marginTop: space.sm,
    minHeight: 58,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  timeSelectorValue: { fontSize: 17, fontWeight: '800', color: colors.text },
  timeSelectorHint: { marginTop: 2, fontSize: 12, color: colors.textSecondary },
  optionPill: {
    paddingHorizontal: space.md,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { fontSize: 14, fontWeight: '700', color: colors.text },
  optionTextActive: { color: '#fff' },
  notesInput: {
    marginTop: space.sm,
    minHeight: 92,
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
  calCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    marginBottom: space.sm,
  },
  calCheckText: { fontSize: 15, fontWeight: '700', color: colors.text },
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
    flexDirection: 'row',
    gap: space.sm,
  },
  secondaryButtonText: { color: colors.primary, fontSize: 15, fontWeight: '800' },
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
  manualTimeCard: {
    margin: space.lg,
    marginBottom: 0,
    padding: space.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    ...shadows.soft,
  },
  manualTimeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  manualTimeInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    color: colors.text,
    fontSize: 16,
    backgroundColor: colors.surface,
  },
  manualTimeButton: {
    minHeight: 48,
    paddingHorizontal: space.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualTimeButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  manualTimeHint: { marginTop: space.sm, fontSize: 12, color: colors.textSecondary },
  modalList: { padding: space.lg },
  timeRow: {
    minHeight: 54,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: space.lg,
    marginBottom: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeRowSelected: { borderColor: colors.primary + '55', backgroundColor: colors.primary + '10' },
  timeRowText: { fontSize: 16, fontWeight: '800', color: colors.text },
  timeRowTextSelected: { color: colors.primaryDark },
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
