import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Linking } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useAuth } from '../../../src/contexts/AuthContext'
import { BrandWordmark } from '../../../src/components/BrandWordmark'
import { InlineErrorBanner } from '../../../src/components/InlineErrorBanner'
import { useNotifications } from '../../../src/contexts/NotificationContext'
import { brand, colors, radii, space, shadows } from '../../../src/theme/tokens'

export default function AccountScreen() {
  const { user, logout, hasBiometrics, startupError, retryAuthCheck } = useAuth()
  const isAttorney = user?.role !== 'plaintiff'
  const { expoPushToken, permissionStatus, setupIssue, isSettingUp, refreshPushSetup } = useNotifications()
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)

  async function handleLogout() {
    setLoggingOut(true)
    setLogoutError(null)
    try {
      await logout()
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {}
      router.replace('/(auth)/login')
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Unable to sign out right now.')
    } finally {
      setLoggingOut(false)
      setConfirmLogoutOpen(false)
    }
  }

  async function openNotificationSettings() {
    try {
      await Linking.openSettings()
    } catch {
      setLogoutError('Unable to open system settings on this device.')
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.profileCard}>
        <View style={styles.brandRow}>
          <BrandWordmark variant="compact" />
        </View>
        <View style={styles.avatar}>
          <Ionicons name="person" size={36} color="#fff" />
        </View>
        <Text style={styles.name}>
          {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || (isAttorney ? 'Attorney' : 'Client') : isAttorney ? 'Attorney' : 'Client'}
        </Text>
        <Text style={styles.email}>{user?.email || '—'}</Text>
      </View>

      <View style={styles.list}>
        <Text style={styles.section}>Security</Text>
        {startupError ? (
          <InlineErrorBanner message={startupError} onAction={() => { void retryAuthCheck() }} />
        ) : null}
        {logoutError ? (
          <InlineErrorBanner message={logoutError} onAction={() => setLogoutError(null)} actionLabel="Dismiss" />
        ) : null}
        <View style={styles.row}>
          <Ionicons name="finger-print-outline" size={22} color={colors.textSecondary} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Face ID / Touch ID</Text>
            <Text style={styles.rowSub}>
              {hasBiometrics
                ? 'Use biometrics to unlock after you have signed in once with password.'
                : 'Not available on this device.'}
            </Text>
          </View>
        </View>
        <View style={[styles.row, styles.rowSpacing]}>
          <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Push notifications</Text>
            <Text style={styles.rowStatus}>
              {isSettingUp
                ? 'Checking setup...'
                : expoPushToken
                  ? 'Ready'
                  : permissionStatus === 'granted'
                    ? 'Configuring'
                    : setupIssue
                      ? 'Action needed'
                      : 'Not enabled'}
            </Text>
            <Text style={styles.rowSub}>
              {setupIssue
                ? setupIssue
                : expoPushToken
                  ? isAttorney
                    ? 'Ready to receive case matches, chat alerts, and consult reminders.'
                    : 'Ready to receive case updates and reminders.'
                  : permissionStatus === 'granted'
                    ? 'Permission granted. Waiting for a device token.'
                    : 'Notifications are not enabled yet.'}
            </Text>
            <View style={styles.rowActions}>
              <TouchableOpacity
                style={[styles.inlineButton, isSettingUp && styles.inlineButtonDisabled]}
                onPress={() => { void refreshPushSetup() }}
                disabled={isSettingUp}
              >
                {isSettingUp ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.inlineButtonText}>
                    {expoPushToken ? 'Refresh setup' : 'Retry setup'}
                  </Text>
                )}
              </TouchableOpacity>
              {setupIssue || permissionStatus !== 'granted' ? (
                <TouchableOpacity style={styles.inlineButton} onPress={() => { void openNotificationSettings() }}>
                  <Text style={styles.inlineButtonText}>Open settings</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.logout, loggingOut && styles.logoutDisabled]}
        onPress={() => {
          setLogoutError(null)
          setConfirmLogoutOpen(true)
        }}
        activeOpacity={0.9}
        disabled={loggingOut}
      >
        <Ionicons name="log-out-outline" size={22} color={colors.danger} />
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        {isAttorney ? `${brand.displayNameAttorney} · Secure connection to your firm dashboard` : `${brand.displayName} · Secure connection to your case updates`}
      </Text>

      <Modal visible={confirmLogoutOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sign out</Text>
            <Text style={styles.modalText}>
              {isAttorney
                ? 'You will need to sign in again to review cases, messages, and reminders.'
                : 'You will need to sign in again to review your case updates and reminders.'}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setConfirmLogoutOpen(false)}
                disabled={loggingOut}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, loggingOut && styles.inlineButtonDisabled]}
                onPress={() => { void handleLogout() }}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Sign out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface, padding: space.lg },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: space.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.xl,
    ...shadows.card,
  },
  brandRow: {
    marginBottom: space.md,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.nav,
    borderWidth: 2,
    borderColor: colors.brandAccent + '55',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  name: { fontSize: 22, fontWeight: '800', color: colors.text },
  email: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
  list: { marginBottom: space.xl },
  section: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: space.md, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, backgroundColor: colors.card, padding: space.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
  rowSpacing: { marginTop: space.md },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  rowStatus: { fontSize: 13, fontWeight: '700', color: colors.primary, marginTop: 6 },
  rowSub: { fontSize: 14, color: colors.textSecondary, marginTop: 4, lineHeight: 20 },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  inlineButton: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary + '55',
    backgroundColor: colors.primary + '10',
  },
  inlineButtonDisabled: { opacity: 0.6 },
  inlineButtonText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    padding: space.lg,
    backgroundColor: colors.dangerMuted,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutDisabled: { opacity: 0.7 },
  logoutText: { fontSize: 17, fontWeight: '700', color: colors.danger },
  footer: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: space.xl, lineHeight: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000066',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: space.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  modalText: { fontSize: 14, lineHeight: 21, color: colors.textSecondary, marginTop: space.sm },
  modalActions: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  modalCancel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  modalConfirm: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.md,
    borderRadius: radii.lg,
    backgroundColor: colors.danger,
  },
  modalConfirmText: { fontSize: 16, fontWeight: '800', color: '#fff' },
})
