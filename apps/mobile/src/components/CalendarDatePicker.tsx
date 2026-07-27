import { useEffect, useMemo, useState } from 'react'
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radii, shadows, space } from '../theme/tokens'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function pad(value: number) {
  return String(value).padStart(2, '0')
}

/** `YYYY-MM-DD` for a local calendar day — never shifts across time zones. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Parse `YYYY-MM-DD` as a local calendar day (noon avoids DST edges). */
export function parseDateKey(key: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || '').trim())
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0)
  return Number.isFinite(date.getTime()) ? date : null
}

/** Long, human-readable form of a `YYYY-MM-DD` value (e.g. "Mon, Jul 27, 2026"). */
export function formatDateKeyLong(key: string | null | undefined): string {
  const date = parseDateKey(key)
  if (!date) return ''
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

type CalendarDatePickerProps = {
  visible: boolean
  /** Currently selected day as `YYYY-MM-DD`. */
  value: string
  onSelect: (dateKey: string) => void
  onClose: () => void
  /** Earliest selectable day as `YYYY-MM-DD`. Earlier days render disabled. */
  minDate?: string
  title?: string
}

export function CalendarDatePicker({
  visible,
  value,
  onSelect,
  onClose,
  minDate,
  title = 'Select date',
}: CalendarDatePickerProps) {
  const selected = parseDateKey(value)
  const [cursor, setCursor] = useState(() => selected || new Date())

  // Re-centre the grid on the selected month each time the sheet opens.
  useEffect(() => {
    if (visible) setCursor(parseDateKey(value) || new Date())
  }, [visible, value])

  const todayKey = toDateKey(new Date())
  const minKey = minDate && /^\d{4}-\d{2}-\d{2}$/.test(minDate) ? minDate : null

  const cells = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const firstWeekday = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const result: (string | null)[] = []
    for (let i = 0; i < firstWeekday; i += 1) result.push(null)
    for (let day = 1; day <= daysInMonth; day += 1) {
      result.push(`${year}-${pad(month + 1)}-${pad(day)}`)
    }
    while (result.length % 7 !== 0) result.push(null)
    return result
  }, [cursor])

  const shiftMonth = (delta: number) => {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1, 12))
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onClose}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Close date picker"
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.monthRow}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => shiftMonth(-1)}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
            >
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </Text>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => shiftMonth(1)}
              accessibilityRole="button"
              accessibilityLabel="Next month"
            >
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((label, index) => (
              <Text key={`${label}-${index}`} style={styles.weekday}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((key, index) => {
              if (!key) return <View key={`blank-${index}`} style={styles.cell} />
              const disabled = Boolean(minKey && key < minKey)
              const isSelected = key === value
              const isToday = key === todayKey
              const day = Number(key.slice(-2))
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.cell}
                  onPress={() => {
                    if (disabled) return
                    onSelect(key)
                    onClose()
                  }}
                  disabled={disabled}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, disabled }}
                  accessibilityLabel={formatDateKeyLong(key)}
                >
                  <View
                    style={[
                      styles.dayPill,
                      isToday && styles.dayPillToday,
                      isSelected && styles.dayPillSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        disabled && styles.dayTextDisabled,
                        isSelected && styles.dayTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>

          {!minKey || todayKey >= minKey ? (
            <TouchableOpacity
              style={styles.todayButton}
              onPress={() => {
                onSelect(todayKey)
                onClose()
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Select today"
            >
              <Ionicons name="today-outline" size={16} color={colors.primaryDark} />
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
    padding: space.lg,
  },
  sheet: {
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  monthRow: {
    marginTop: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthLabel: { fontSize: 16, fontWeight: '800', color: colors.text },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  weekRow: { marginTop: space.sm, flexDirection: 'row' },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.xs },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillToday: { borderWidth: 1, borderColor: colors.primary + '66' },
  dayPillSelected: { backgroundColor: colors.primary },
  dayText: { fontSize: 15, fontWeight: '700', color: colors.text },
  dayTextDisabled: { color: colors.muted },
  dayTextSelected: { color: '#fff' },
  todayButton: {
    marginTop: space.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary + '44',
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
  },
  todayButtonText: { fontSize: 14, fontWeight: '800', color: colors.primaryDark },
})
