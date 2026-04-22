import { Text, TouchableOpacity, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radii, space } from '../theme/tokens'

export function InlineErrorBanner({
  message,
  actionLabel = 'Retry',
  onAction,
}: {
  message: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <View style={styles.banner}>
      <View style={styles.copyWrap}>
        <Ionicons name="warning-outline" size={18} color={colors.warning} />
        <Text style={styles.message}>{message}</Text>
      </View>
      {onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: space.md,
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.warningMuted,
    borderWidth: 1,
    borderColor: colors.warning,
    gap: space.sm,
  },
  copyWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  action: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
})
