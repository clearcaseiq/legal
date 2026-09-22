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
import { LEGAL_LINKS, NOT_A_LAW_FIRM, NOT_A_LAW_FIRM_PLAINTIFF } from '../../src/lib/legalLinks'

/**
 * Sign-in.
 *
 * Everyone who reaches this screen already has an account, which is the fact the
 * previous layout argued with. Above the email field sat a badge, a wordmark, a
 * tagline, three value propositions and a card of invented figures — "$285K",
 * "94%", "High" liability — selling the product to someone who had already
 * bought it. On a smaller phone the password field was below the fold, so the
 * one thing the screen exists to do was the one thing you had to scroll for.
 *
 * The fabricated numbers were the worse half. They carried a "sample figures"
 * disclaimer, which is the tell: an element that has to disclaim itself is
 * usually an element that should not be there, and a made-up settlement value on
 * the sign-in screen of a product whose whole claim is careful valuation costs
 * more credibility than it buys.
 *
 * What is left is the task, in the order it is performed: who you are, then Face
 * ID if it is set up, then the two fields, then the button. The security claims
 * that survive are the two that say something checkable, stated once rather than
 * in a badge at the top and again in chips at the bottom.
 *
 * The legal block stays regardless of layout. This is the only screen reachable
 * without signing in, so it is the only place the platform statement and the
 * policy links can live.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const SUBTITLE = IS_PLAINTIFF_APP
  ? 'Your personal injury case, clear and always up to date.'
  : 'The AI operating system for personal injury law.'

/**
 * Both claims the old trust chips made that mean anything. "Secure
 * authentication" was the third, and it only restates that this is a login.
 */
const SECURITY_NOTE = 'HIPAA compliant · 256-bit encryption'

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
  const [error, setError] = useState<string | null>(null)
  const [savedName, setSavedName] = useState<string | null>(null)
  const { login, hasBiometrics, authenticateWithBiometrics } = useAuth()

  // "Next" on the email keyboard used to do nothing: the prop was set but there
  // was no ref to hand the focus to.
  const passwordRef = useRef<TextInput>(null)

  useEffect(() => {
    SecureStore.getItemAsync('last_login_name')
      .then((name) => {
        if (name && name.trim()) setSavedName(name.trim())
      })
      .catch(() => {})
  }, [])

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
    try {
      await login(normalizeAuthEmail(email), password)
      router.replace('/(app)/(tabs)')
    } catch (err: unknown) {
      setError(signInErrorMessage(err))
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
        setError('Sign in with your work email and password once. Face ID unlock works after your first successful login.')
      } else if (result === 'restore_failed') {
        setError('We could not restore your saved session. Sign in with email and password and try Face ID again.')
      }
    } finally {
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
            <BrandWordmark variant="hero" />
            <Text style={styles.subtitle}>{SUBTITLE}</Text>
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
              <View accessibilityLiveRegion="assertive" accessibilityRole="alert">
                <InlineErrorBanner
                  message={error}
                  actionLabel="Dismiss"
                  onAction={() => setError(null)}
                />
              </View>
            ) : null}

            {/* For anyone who has signed in before, this is the whole
                interaction, so it comes before the fields rather than after. */}
            {hasBiometrics && (
              <>
                <TouchableOpacity
                  style={[styles.faceIdButton, loading && styles.buttonDisabled]}
                  onPress={handleBiometricLogin}
                  activeOpacity={0.9}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Face ID"
                  accessibilityState={{ disabled: loading }}
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
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  submitBehavior="submit"
                  accessibilityLabel={IS_PLAINTIFF_APP ? 'Email' : 'Work email'}
                />
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>Password</Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL(LEGAL_LINKS.forgotPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="link"
                  accessibilityLabel="Forgot password"
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputShell}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
                <TextInput
                  ref={passwordRef}
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
                  accessibilityLabel="Password"
                />
                <TouchableOpacity
                  onPress={() => setPasswordVisible((value) => !value)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
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
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityState={{ disabled: loading, busy: loading }}
            >
              {/* One honest label. The old three-stage ticker claimed to be
                  "scanning today's cases" during what is a single request. */}
              {loading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.buttonText}>Signing in…</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Sign in</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.securityRow}>
              <Ionicons name="shield-checkmark-outline" size={13} color={colors.brandAccent} />
              <Text style={styles.securityText}>{SECURITY_NOTE}</Text>
            </View>
          </View>

          {/* The only screen a consumer can reach without signing in, so it
              carries the platform statement and the policy links (T4). */}
          <View style={styles.legalBlock}>
            <Text style={styles.legalText}>{IS_PLAINTIFF_APP ? NOT_A_LAW_FIRM_PLAINTIFF : NOT_A_LAW_FIRM}</Text>
            <View style={styles.legalLinks}>
              <TouchableOpacity
                onPress={() => Linking.openURL(LEGAL_LINKS.terms)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="link"
                accessibilityLabel="Terms"
              >
                <Text style={styles.legalLink}>Terms</Text>
              </TouchableOpacity>
              <Text style={styles.legalDot}>·</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(LEGAL_LINKS.privacy)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="link"
                accessibilityLabel="Privacy policy"
              >
                <Text style={styles.legalLink}>Privacy</Text>
              </TouchableOpacity>
              <Text style={styles.legalDot}>·</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(LEGAL_LINKS.disclosures)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="link"
                accessibilityLabel="Disclosures"
              >
                <Text style={styles.legalLink}>Disclosures</Text>
              </TouchableOpacity>
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
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(226,232,240,0.82)',
    textAlign: 'center',
    marginTop: space.sm,
    lineHeight: 21,
    maxWidth: 300,
  },
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
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: space.lg,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(203,213,225,0.85)',
    letterSpacing: 0.2,
  },
  legalBlock: {
    marginTop: space.lg,
    alignItems: 'center',
  },
  legalText: {
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(148,163,184,0.85)',
    textAlign: 'center',
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.sm,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(203,213,225,0.9)',
  },
  legalDot: { fontSize: 12, color: 'rgba(148,163,184,0.6)' },
})
