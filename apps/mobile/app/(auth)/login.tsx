import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { getApiErrorMessage, getApiTroubleshootingMessage } from '../../src/lib/api'
import { BrandWordmark } from '../../src/components/BrandWordmark'
import { InlineErrorBanner } from '../../src/components/InlineErrorBanner'
import { colors, radii, shadows, space } from '../../src/theme/tokens'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login, hasBiometrics, authenticateWithBiometrics } = useAuth()

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Please enter email and password.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const normalizedEmail = email.trim().toLowerCase()
      await login(normalizedEmail, password)
      router.replace('/(app)/(tabs)')
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleBiometricLogin() {
    if (!hasBiometrics || loading) return
    setLoading(true)
    setError(null)
    try {
      const result = await authenticateWithBiometrics()
      if (result === 'authenticated') {
        router.replace('/(app)/(tabs)')
        return
      }
      if (result === 'missing_session') {
        setError('Please sign in with email and password first. Biometric unlock works after your first successful login.')
      } else if (result === 'restore_failed') {
        setError('We could not restore your saved session. Sign in with email and password and try biometric unlock again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.backgroundLayer}>
        <View style={[styles.glowOrb, styles.glowOrbPrimary]} />
        <View style={[styles.glowOrb, styles.glowOrbAccent]} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.wordmarkBlock}>
            <View style={styles.heroBadge}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.brandAccent} />
              <Text style={styles.heroBadgeText}>Secure attorney access</Text>
            </View>
            <BrandWordmark variant="hero" />
            <Text style={styles.subtitle}>Decision-ready case intelligence from anywhere.</Text>
            <View style={styles.underlineAccent} />
          </View>

          <View style={styles.formPanel}>
            {error ? (
              <InlineErrorBanner
                message={`${error} ${getApiTroubleshootingMessage()}`}
                actionLabel="Dismiss"
                onAction={() => setError(null)}
              />
            ) : null}

            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Sign in</Text>
            </View>

            <View style={styles.fieldBlock}>
              <View style={styles.inputShell}>
                <Ionicons name="mail-outline" size={18} color={colors.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="name@firm.com"
                  placeholderTextColor={colors.muted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="username"
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <View style={styles.inputShell}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!passwordVisible}
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setPasswordVisible((value) => !value)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="arrow-forward-circle-outline" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Sign in</Text>
                </View>
              )}
            </TouchableOpacity>

            {hasBiometrics && (
              <TouchableOpacity
                style={[styles.biometricButton, loading && styles.biometricButtonDisabled]}
                onPress={handleBiometricLogin}
                activeOpacity={0.82}
                disabled={loading}
              >
                <Ionicons name="scan-outline" size={18} color={colors.brandAccent} />
                <Text style={styles.biometricText}>Use Face ID / Fingerprint</Text>
              </TouchableOpacity>
            )}

            <View style={styles.trustBlock}>
              <View style={styles.trustRow}>
                <Ionicons name="lock-closed-outline" size={14} color={colors.brandAccent} />
                <Text style={styles.trustText}>Encrypted session on this device</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navDeep,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.navDeep,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowOrbPrimary: {
    width: 220,
    height: 220,
    top: -70,
    right: -70,
    backgroundColor: 'rgba(14,165,233,0.14)',
  },
  glowOrbAccent: {
    width: 180,
    height: 180,
    bottom: 80,
    left: -80,
    backgroundColor: 'rgba(34,211,238,0.1)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: space.xl,
  },
  wordmarkBlock: {
    marginBottom: space.xxl,
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.24)',
    marginBottom: space.lg,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brandAccent,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
    marginTop: space.md,
    letterSpacing: 0.2,
    lineHeight: 26,
  },
  underlineAccent: {
    width: 64,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.brandAccent,
    marginTop: space.lg,
    opacity: 0.92,
  },
  formPanel: {
    backgroundColor: 'rgba(15,23,42,0.76)',
    borderRadius: radii['2xl'],
    padding: space.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    ...shadows.card,
  },
  panelHeader: {
    marginBottom: space.lg,
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  fieldBlock: {
    marginBottom: space.md,
  },
  inputShell: {
    backgroundColor: colors.loginFieldBg,
    borderRadius: radii.lg,
    paddingHorizontal: space.md,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.loginFieldBorder,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingVertical: space.lg,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.sm,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  biometricButton: {
    marginTop: space.md,
    minHeight: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.28)',
    backgroundColor: 'rgba(34,211,238,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  biometricButtonDisabled: {
    opacity: 0.6,
  },
  biometricText: {
    color: colors.brandAccent,
    fontSize: 16,
    fontWeight: '600',
  },
  trustBlock: {
    marginTop: space.lg,
    gap: space.sm,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  trustText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(203,213,225,0.9)',
  },
})
