import { useEffect, useRef, useState } from 'react'
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
  Linking,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as SecureStore from 'expo-secure-store'
import { useAuth } from '../../src/contexts/AuthContext'
import { getApiErrorMessage, getApiTroubleshootingMessage, isOfflineError, normalizeAuthEmail } from '../../src/lib/api'
import { BrandWordmark } from '../../src/components/BrandWordmark'
import { InlineErrorBanner } from '../../src/components/InlineErrorBanner'
import { colors, radii, shadows, space } from '../../src/theme/tokens'
import { IS_PLAINTIFF_APP } from '../../src/lib/appVariant'

const FORGOT_PASSWORD_URL = 'https://www.clearcaseiq.com/forgot-password'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const VALUE_PROPS = IS_PLAINTIFF_APP
  ? (['Track your case status in real time', 'See your settlement estimate', 'Message your legal team securely'] as const)
  : (['AI medical chronologies', 'Settlement valuations', 'Demand letters & case intelligence'] as const)

// Ambient, illustrative preview of what the app delivers (not live data).
const PREVIEW_STATS: { label: string; value: string; tone: 'accent' | 'success' | 'warning' }[] = IS_PLAINTIFF_APP
  ? [
      { label: 'Case status', value: 'Active', tone: 'success' },
      { label: 'Settlement est.', value: '$285K', tone: 'success' },
      { label: 'Documents', value: '2 due', tone: 'warning' },
      { label: 'Next update', value: 'Soon', tone: 'accent' },
    ]
  : [
      { label: 'Case score', value: '94%', tone: 'accent' },
      { label: 'Settlement est.', value: '$285K', tone: 'success' },
      { label: 'Medical chronology', value: 'Ready', tone: 'success' },
      { label: 'Liability', value: 'High', tone: 'warning' },
    ]

const LOGIN_STAGES = IS_PLAINTIFF_APP
  ? (['Verifying credentials', 'Loading your case', 'Opening your dashboard'] as const)
  : (['Verifying credentials', "Scanning today's cases", 'Opening dashboard'] as const)

const SUBTITLE = IS_PLAINTIFF_APP
  ? 'Your personal injury case, clear and always up to date.'
  : 'The AI operating system for personal injury law.'

const PREVIEW_LABEL = IS_PLAINTIFF_APP ? 'Your case at a glance' : 'Case intelligence preview'

/**
 * Sign-in failures need a plain message. API-host troubleshooting only helps
 * when the request never reached the server, so it stays out of the way of a
 * rejected email/password (CP-407).
 */
function signInErrorMessage(err: unknown): string {
  const message = getApiErrorMessage(err)
  return isOfflineError(err) ? `${message} ${getApiTroubleshootingMessage()}` : message
}

function greetingForNow(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [savedName, setSavedName] = useState<string | null>(null)
  const { login, hasBiometrics, authenticateWithBiometrics } = useAuth()

  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    SecureStore.getItemAsync('last_login_name')
      .then((name) => {
        if (name && name.trim()) setSavedName(name.trim())
      })
      .catch(() => {})
    return () => stopStageCycle()
  }, [])

  function startStageCycle() {
    setLoadingStage(0)
    stopStageCycle()
    stageTimer.current = setInterval(() => {
      setLoadingStage((stage) => Math.min(stage + 1, LOGIN_STAGES.length - 1))
    }, 850)
  }

  function stopStageCycle() {
    if (stageTimer.current) {
      clearInterval(stageTimer.current)
      stageTimer.current = null
    }
  }

  async function handleLogin() {
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setError(IS_PLAINTIFF_APP ? 'Please enter your email and password.' : 'Please enter your work email and password.')
      return
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError(`Enter a valid email address, for example ${IS_PLAINTIFF_APP ? 'you@email.com' : 'name@firm.com'}.`)
      return
    }
    setLoading(true)
    setError(null)
    startStageCycle()
    try {
      await login(normalizeAuthEmail(email), password)
      router.replace('/(app)/(tabs)')
    } catch (err: unknown) {
      setError(signInErrorMessage(err))
    } finally {
      stopStageCycle()
      setLoading(false)
    }
  }

  async function handleBiometricLogin() {
    if (!hasBiometrics || loading) return
    setLoading(true)
    setError(null)
    startStageCycle()
    try {
      const result = await authenticateWithBiometrics()
      if (result === 'authenticated') {
        router.replace('/(app)/(tabs)')
        return
      }
      if (result === 'missing_session') {
        setError('Sign in with your work email and password once. Face ID unlock works after your first successful login.')
      } else if (result === 'restore_failed') {
        setError('We could not restore your saved session. Sign in with email and password and try Face ID again.')
      }
    } finally {
      stopStageCycle()
      setLoading(false)
    }
  }

  const greeting = greetingForNow()

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.backgroundLayer}>
        <View style={styles.topWash} />
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
              <Ionicons name="shield-checkmark" size={13} color={colors.brandAccent} />
              <Text style={styles.heroBadgeText}>HIPAA Secure</Text>
            </View>
            <BrandWordmark variant="hero" />
            <Text style={styles.subtitle}>{SUBTITLE}</Text>

            <View style={styles.valueProps}>
              {VALUE_PROPS.map((item) => (
                <View key={item} style={styles.valueRow}>
                  <View style={styles.valueTick}>
                    <Ionicons name="checkmark" size={12} color={colors.brandAccent} />
                  </View>
                  <Text style={styles.valueText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={styles.previewPulse} />
              <Text style={styles.previewLabel}>{PREVIEW_LABEL}</Text>
            </View>
            <View style={styles.previewGrid}>
              {PREVIEW_STATS.map((stat) => (
                <View key={stat.label} style={styles.previewStat}>
                  <Text style={styles.previewStatLabel}>{stat.label}</Text>
                  <Text style={[styles.previewStatValue, styles[`tone_${stat.tone}`]]}>{stat.value}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.formPanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.greeting}>
                {greeting}
                {savedName ? `, ${savedName}` : ''}
              </Text>
              <Text style={styles.greetingSub}>
                {IS_PLAINTIFF_APP
                  ? savedName
                    ? 'Welcome back. Here is the latest on your case.'
                    : 'Sign in to track your case.'
                  : savedName
                    ? 'Welcome back. Ready to review your cases?'
                    : 'Sign in to review your cases.'}
              </Text>
            </View>

            {error ? (
              <InlineErrorBanner
                message={error}
                actionLabel="Dismiss"
                onAction={() => setError(null)}
              />
            ) : null}

            {hasBiometrics && (
              <>
                <TouchableOpacity
                  style={[styles.faceIdButton, loading && styles.buttonDisabled]}
                  onPress={handleBiometricLogin}
                  activeOpacity={0.9}
                  disabled={loading}
                >
                  <Ionicons name="scan-outline" size={20} color={colors.loginBg} />
                  <Text style={styles.faceIdText}>Continue with Face ID</Text>
                </TouchableOpacity>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{IS_PLAINTIFF_APP ? 'or use your email' : 'or use your work email'}</Text>
                  <View style={styles.dividerLine} />
                </View>
              </>
            )}

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>{IS_PLAINTIFF_APP ? 'Email' : 'Work email'}</Text>
              <View style={styles.inputShell}>
                <Ionicons name="mail-outline" size={18} color={colors.muted} />
                <TextInput
                  style={styles.input}
                  placeholder={IS_PLAINTIFF_APP ? 'you@email.com' : 'name@firm.com'}
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
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>Password</Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL(FORGOT_PASSWORD_URL)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
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
              style={[styles.button, hasBiometrics && styles.buttonSecondary, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.buttonText}>{LOGIN_STAGES[loadingStage]}…</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Continue securely</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.trustRow}>
              {['HIPAA compliant', '256-bit encryption', 'Secure authentication'].map((label, index) => (
                <View key={label} style={styles.trustChip}>
                  {index === 0 && <Ionicons name="shield-checkmark-outline" size={12} color={colors.brandAccent} />}
                  {index === 1 && <Ionicons name="lock-closed-outline" size={12} color={colors.brandAccent} />}
                  {index === 2 && <Ionicons name="finger-print-outline" size={12} color={colors.brandAccent} />}
                  <Text style={styles.trustChipText}>{label}</Text>
                </View>
              ))}
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
    backgroundColor: colors.loginBg,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.loginBg,
    overflow: 'hidden',
  },
  topWash: {
    position: 'absolute',
    top: -260,
    left: -120,
    right: -120,
    height: 520,
    borderRadius: 999,
    backgroundColor: colors.loginBgElevated,
    opacity: 0.55,
  },
  glowOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowOrbPrimary: {
    width: 260,
    height: 260,
    top: -90,
    right: -80,
    backgroundColor: 'rgba(56,189,248,0.20)',
  },
  glowOrbAccent: {
    width: 200,
    height: 200,
    bottom: 60,
    left: -90,
    backgroundColor: 'rgba(34,211,238,0.14)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: space.xl,
  },
  content: {
    padding: space.xl,
  },
  wordmarkBlock: {
    marginBottom: space.xl,
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.32)',
    marginBottom: space.lg,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brandAccent,
    letterSpacing: 0.6,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(226,232,240,0.86)',
    textAlign: 'center',
    marginTop: space.md,
    lineHeight: 23,
    maxWidth: 300,
  },
  valueProps: {
    marginTop: space.lg,
    gap: space.sm,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  valueTick: {
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,211,238,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.3)',
  },
  valueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    letterSpacing: 0.2,
  },
  previewCard: {
    backgroundColor: 'rgba(15,23,42,0.45)',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: space.lg,
    marginBottom: space.lg,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.md,
  },
  previewPulse: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.brandAccent,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(148,163,184,0.95)',
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  previewStat: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  previewStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(148,163,184,0.9)',
    marginBottom: 2,
  },
  previewStatValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  tone_accent: { color: colors.brandAccent },
  tone_success: { color: '#4ade80' },
  tone_warning: { color: '#fbbf24' },
  formPanel: {
    backgroundColor: 'rgba(15,23,42,0.82)',
    borderRadius: radii['2xl'],
    padding: space.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    ...shadows.card,
  },
  panelHeader: {
    marginBottom: space.lg,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  greetingSub: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(203,213,225,0.85)',
    marginTop: 4,
  },
  faceIdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.brandAccent,
    marginBottom: space.md,
    shadowColor: colors.brandAccent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  faceIdText: {
    color: colors.loginBg,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(148,163,184,0.9)',
  },
  fieldBlock: {
    marginBottom: space.lg,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(226,232,240,0.9)',
    letterSpacing: 0.2,
    marginBottom: space.sm,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brandAccent,
    marginBottom: space.sm,
  },
  inputShell: {
    backgroundColor: colors.loginFieldBg,
    borderRadius: radii.lg,
    paddingHorizontal: space.lg,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
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
    marginTop: space.xs,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonSecondary: {
    backgroundColor: 'rgba(56,189,248,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.4)',
    shadowOpacity: 0,
    elevation: 0,
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
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space.sm,
    marginTop: space.xl,
  },
  trustChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: space.sm,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  trustChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(203,213,225,0.9)',
  },
})
