import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, space } from '../theme/tokens'

type ScreenStateProps = {
  title: string
  message?: string
  icon?: keyof typeof Ionicons.glyphMap
  actionLabel?: string
  onAction?: () => void
  loading?: boolean
}

export function ScreenState({
  title,
  message,
  icon = 'information-circle-outline',
  actionLabel,
  onAction,
  loading = false,
}: ScreenStateProps) {
  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primaryDark} />
      ) : (
        <Ionicons name={icon} size={48} color={colors.muted} />
      )}
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.button} onPress={onAction} activeOpacity={0.88}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    backgroundColor: colors.surface,
  },
  title: {
    marginTop: space.md,
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    marginTop: space.sm,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    marginTop: space.lg,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
})
