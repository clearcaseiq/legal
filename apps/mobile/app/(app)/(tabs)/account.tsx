import { useCallback, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Linking } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useAuth } from '../../../src/contexts/AuthContext'
import { BrandWordmark } from '../../../src/components/BrandWordmark'
import { InlineErrorBanner } from '../../../src/components/InlineErrorBanner'
import { useNotifications } from '../../../src/contexts/NotificationContext'
import {
  disconnectAttorneyCalendar,
  getApiErrorMessage,
  getAttorneyCalendarConnectUrl,
  getAttorneyCalendarHealth,
  syncAttorneyCalendar,
  type AttorneyCalendarConnection,
} from '../../../src/lib/api'
import { brand, colors, radii, space, shadows } from '../../../src/theme/tokens'

export default function AccountScreen() {
  const { user, logout, hasBiometrics, startupError, retryAuthCheck } = useAuth()
  const isAttorney = user?.role !== 'plaintiff'
  const { expoPushToken, permissionStatus, setupIssue, isSettingUp, refreshPushSetup } = useNotifications()
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [calendarConnections, setCalendarConnections] = useState<AttorneyCalendarConnection[]>([])
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarActionProvider, setCalendarActionProvider] = useState<string | null>(null)
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null)

  const loadCalendarHealth = useCallback(async () => {
    if (!isAttorney) return
    try {
      setCalendarLoading(true)
      const response = await getAttorneyCalendarHealth()
      setCalendarConnections(response.connections || [])
    } catch (error) {
      setCalendarMessage(getApiErrorMessage(error))
    } finally {
      setCalendarLoading(false)
    }
  }, [isAttorney])

  useFocusEffect(
    useCallback(() => {
      void loadCalendarHealth()
    }, [loadCalendarHealth])
  )

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

  async function handleConnectCalendar(provider: 'google' | 'microsoft') {
    try {
      setCalendarMessage(null)
      setCalendarActionProvider(provider)
      const response = await getAttorneyCalendarConnectUrl(provider)
      await Linking.openURL(response.authorizeUrl)
      setCalendarMessage('Finish authorization in the browser, then return here and pull to refresh or tap Sync now.')
    } catch (error) {
      setCalendarMessage(getApiErrorMessage(error))
    } finally {
      setCalendarActionProvider(null)
    }
  }

  async function handleSyncCalendar(provider: 'google' | 'microsoft') {
    try {
      setCalendarMessage(null)
      setCalendarActionProvider(provider)
      const response = await syncAttorneyCalendar(provider)
      await loadCalendarHealth()
      setCalendarMessage(
        `Synced ${response.syncedBlocks} busy time block${response.syncedBlocks === 1 ? '' : 's'} from ${
          provider === 'google' ? 'Google Calendar' : 'Microsoft Outlook'
        }.`
      )
    } catch (error) {
      setCalendarMessage(getApiErrorMessage(error))
    } finally {
      setCalendarActionProvider(null)
    }
  }

  async function handleDisconnectCalendar(provider: 'google' | 'microsoft') {
    try {
      setCalendarMessage(null)
      setCalendarActionProvider(provider)
      await disconnectAttorneyCalendar(provider)
      await loadCalendarHealth()
      setCalendarMessage(`${provider === 'google' ? 'Google Calendar' : 'Microsoft Outlook'} disconnected.`)
    } catch (error) {
      setCalendarMessage(getApiErrorMessage(error))
    } finally {
      setCalendarActionProvider(null)
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
        {isAttorney ? (
          <View style={[styles.row, styles.rowSpacing]}>
            <Ionicons name="calendar-outline" size={22} color={colors.textSecondary} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Calendar sync</Text>
              <Text style={styles.rowSub}>
                Connect Google or Microsoft Calendar so consult scheduling can respect your current availability.
              </Text>
              {calendarMessage ? (
                <Text style={[styles.rowSub, styles.calendarMessage]}>{calendarMessage}</Text>
              ) : null}
              {calendarLoading ? (
                <ActivityIndicator size="small" color={colors.primary} style={styles.calendarLoader} />
              ) : (
                <View style={styles.calendarCards}>
                  {(['google', 'microsoft'] as const).map((provider) => {
                    const connection = calendarConnections.find((item) => item.provider === provider)
                    const connected = !!connection?.connected
                    const label = provider === 'google' ? 'Google Calendar' : 'Microsoft Outlook'
                    const busyBlocks = connection?.health?.busyBlockCount ?? 0
                    const actionLoading = calendarActionProvider === provider
                    return (
                      <View key={provider} style={styles.calendarCard}>
                        <View style={styles.calendarCardTop}>
                          <Text style={styles.calendarTitle}>{label}</Text>
                          <Text style={[styles.calendarStatus, connected ? styles.calendarStatusConnected : styles.calendarStatusDisconnected]}>
                            {connected ? 'Connected' : 'Off'}
                          </Text>
                        </View>
                        <Text style={styles.calendarDetail}>
                          {connected
                            ? `${connection?.externalAccountEmail || connection?.calendarName || 'Connected'}${
                                connection?.lastSyncedAt ? ` · synced ${new Date(connection.lastSyncedAt).toLocaleDateString()}` : ''
                              }`
                            : 'Not connected'}
                        </Text>
                        {connected ? (
                          <Text style={styles.calendarDetail}>
                            {busyBlocks} busy block{busyBlocks === 1 ? '' : 's'} synced
                            {connection?.autoSyncEnabled ? ' · auto-sync active' : ''}
                          </Text>
                        ) : null}
                        {connection?.lastSyncError ? <Text style={styles.calendarError}>{connection.lastSyncError}</Text> : null}
                        <View style={styles.rowActions}>
                          <TouchableOpacity
                            style={[styles.inlineButton, actionLoading && styles.inlineButtonDisabled]}
                            onPress={() => { void handleConnectCalendar(provider) }}
                            disabled={actionLoading}
                          >
                            <Text style={styles.inlineButtonText}>{connected ? 'Reconnect' : 'Connect'}</Text>
                          </TouchableOpacity>
                          {connected ? (
                            <>
                              <TouchableOpacity
                                style={[styles.inlineButton, actionLoading && styles.inlineButtonDisabled]}
                                onPress={() => { void handleSyncCalendar(provider) }}
                                disabled={actionLoading}
                              >
                                <Text style={styles.inlineButtonText}>Sync now</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.inlineButton, actionLoading && styles.inlineButtonDisabled]}
                                onPress={() => { void handleDisconnectCalendar(provider) }}
                                disabled={actionLoading}
                              >
                                <Text style={styles.inlineButtonText}>Disconnect</Text>
                              </TouchableOpacity>
                            </>
                          ) : null}
                        </View>
                      </View>
                    )
                  })}
                </View>
              )}
            </View>
          </View>
        ) : null}
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
  calendarMessage: { color: colors.primary, fontWeight: '700' },
  calendarLoader: { alignSelf: 'flex-start', marginTop: space.md },
  calendarCards: { gap: space.md, marginTop: space.md },
  calendarCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: space.md,
    backgroundColor: colors.surface,
  },
  calendarCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  calendarTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.text },
  calendarStatus: { fontSize: 12, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  calendarStatusConnected: { color: colors.success, backgroundColor: colors.successMuted },
  calendarStatusDisconnected: { color: colors.textSecondary, backgroundColor: colors.border },
  calendarDetail: { fontSize: 12, color: colors.textSecondary, marginTop: 6, lineHeight: 17 },
  calendarError: { fontSize: 12, color: colors.warning, marginTop: 6, lineHeight: 17 },
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
