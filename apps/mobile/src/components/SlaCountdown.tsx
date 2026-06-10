import { useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radii, space } from '../theme/tokens'

type Props = {
  /** When the lead was received/routed to the attorney. */
  receivedAt: string | number | Date | null | undefined
  /** SLA window in hours (from admin config). */
  slaHours: number
  compact?: boolean
}

function formatRemaining(ms: number): string {
  if (ms <= 0) {
    const overdueH = Math.floor(-ms / 3_600_000)
    if (overdueH >= 1) return `${overdueH}h overdue`
    const overdueM = Math.max(1, Math.floor(-ms / 60_000))
    return `${overdueM}m overdue`
  }
  const totalMin = Math.floor(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h >= 1) return `${h}h ${m}m left`
  return `${m}m left`
}

/**
 * "Respond within Xh" countdown for an undecided lead. Speed-to-lead is the
 * single biggest conversion lever, so this keeps the deadline visible.
 */
export function SlaCountdown({ receivedAt, slaHours, compact }: Props) {
  const deadline = useMemo(() => {
    if (!receivedAt) return null
    const base = new Date(receivedAt).getTime()
    if (!Number.isFinite(base)) return null
    return base + slaHours * 3_600_000
  }, [receivedAt, slaHours])

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  if (!deadline) return null

  const remaining = deadline - now
  const totalWindow = slaHours * 3_600_000
  const tone =
    remaining <= 0 ? 'danger' : remaining <= totalWindow * 0.25 ? 'warning' : 'success'
  const palette =
    tone === 'danger'
      ? { bg: colors.dangerMuted, fg: colors.danger }
      : tone === 'warning'
      ? { bg: colors.warningMuted, fg: colors.warning }
      : { bg: colors.successMuted, fg: colors.success }

  const label = formatRemaining(remaining)

  return (
    <View
      style={[styles.badge, { backgroundColor: palette.bg }, compact && styles.badgeCompact]}
      accessibilityRole="text"
      accessibilityLabel={`Respond within ${slaHours} hours. ${label}.`}
    >
      <Ionicons name={remaining <= 0 ? 'alert-circle' : 'time-outline'} size={compact ? 13 : 15} color={palette.fg} />
      <Text style={[styles.text, { color: palette.fg }, compact && styles.textCompact]}>
        {compact ? label : `Respond within ${slaHours}h · ${label}`}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  badgeCompact: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
  text: { fontSize: 13, fontWeight: '800' },
  textCompact: { fontSize: 12, fontWeight: '700' },
})
