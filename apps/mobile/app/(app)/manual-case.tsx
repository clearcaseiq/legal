import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { createManualIntake, getApiErrorMessage, getAttorneyProfilePreferences } from '../../src/lib/api'
import { InlineErrorBanner } from '../../src/components/InlineErrorBanner'
import { colors, radii, shadows, space } from '../../src/theme/tokens'

const CASE_TYPES = [
  { id: 'auto', label: 'Auto accident' },
  { id: 'slip_and_fall', label: 'Slip and fall' },
  { id: 'workplace', label: 'Workplace injury' },
  { id: 'medmal', label: 'Medical malpractice' },
  { id: 'dog_bite', label: 'Dog bite' },
  { id: 'product', label: 'Product liability' },
  { id: 'other', label: 'Other' },
]

const FALLBACK_STATES = ['CA', 'TX', 'FL', 'NY', 'GA', 'IL', 'AZ', 'NV']

export default function ManualCaseScreen() {
  const [claimType, setClaimType] = useState('auto')
  const [otherClaimType, setOtherClaimType] = useState('')
  const [venueState, setVenueState] = useState('CA')
  const [attorneyVenueStates, setAttorneyVenueStates] = useState<string[]>(['CA'])
  const [notes, setNotes] = useState('')
  const [plaintiffFirstName, setPlaintiffFirstName] = useState('')
  const [plaintiffLastName, setPlaintiffLastName] = useState('')
  const [plaintiffEmail, setPlaintiffEmail] = useState('')
  const [plaintiffPhone, setPlaintiffPhone] = useState('')
  const [sendInvite, setSendInvite] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const venueStates = useMemo(
    () => Array.from(new Set([...attorneyVenueStates, ...FALLBACK_STATES])),
    [attorneyVenueStates]
  )

  useEffect(() => {
    getAttorneyProfilePreferences()
      .then((preferences) => {
        const states = preferences.venueStates || []
        setAttorneyVenueStates(states)
        setVenueState(preferences.defaultVenueState || states[0] || 'CA')
      })
      .catch(() => {
        setAttorneyVenueStates(['CA'])
        setVenueState('CA')
      })
  }, [])

  async function submit() {
    if (saving) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const finalClaimType = claimType === 'other'
        ? (otherClaimType.trim() || 'other')
        : claimType
      const created = await createManualIntake({
        claimType: finalClaimType,
        venueState,
        notes: notes.trim() || undefined,
        plaintiffFirstName: plaintiffFirstName.trim() || undefined,
        plaintiffLastName: plaintiffLastName.trim() || undefined,
        plaintiffEmail: plaintiffEmail.trim() || undefined,
        plaintiffPhone: plaintiffPhone.trim() || undefined,
        sendInvite: sendInvite && !!plaintiffEmail.trim(),
      })
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } catch {
        // Haptics are best-effort.
      }
      setMessage(
        created.inviteSent
          ? `Manual case created and invite sent to ${created.plaintiffEmail}.`
          : `Manual case created: ${created.claimType || finalClaimType} in ${created.venueState || venueState}.`
      )
      setNotes('')
      setPlaintiffFirstName('')
      setPlaintiffLastName('')
      setPlaintiffEmail('')
      setPlaintiffPhone('')
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Add manual case</Text>
        <Text style={styles.subtitle}>Create a draft intake from mobile, then finish details and documents as the case develops.</Text>

        {error ? <InlineErrorBanner message={error} onAction={() => setError(null)} actionLabel="Dismiss" /> : null}
        {message ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
            <Text style={styles.successText}>{message}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.label}>Case type</Text>
          <View style={styles.optionWrap}>
            {CASE_TYPES.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.optionPill, claimType === item.id && styles.optionPillActive]}
                onPress={() => setClaimType(item.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.optionText, claimType === item.id && styles.optionTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {claimType === 'other' ? (
            <>
              <Text style={[styles.label, styles.fieldGap]}>Other case type</Text>
              <TextInput
                style={styles.textInput}
                value={otherClaimType}
                onChangeText={setOtherClaimType}
                placeholder="Example: Civil rights, elder abuse, premises liability"
                placeholderTextColor={colors.muted}
              />
            </>
          ) : null}

          <Text style={[styles.label, styles.fieldGap]}>Venue state</Text>
          <Text style={styles.helperText}>Defaulted from the attorney profile. Choose another state only if this case belongs in a different venue.</Text>
          <View style={styles.optionWrap}>
            {venueStates.map((state) => (
              <TouchableOpacity
                key={state}
                style={[
                  styles.statePill,
                  attorneyVenueStates.includes(state) && styles.attorneyStatePill,
                  venueState === state && styles.optionPillActive,
                ]}
                onPress={() => setVenueState(state)}
                activeOpacity={0.85}
              >
                <Text style={[styles.optionText, venueState === state && styles.optionTextActive]}>{state}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, styles.fieldGap]}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Client name, incident summary, referral source, or next steps"
            placeholderTextColor={colors.muted}
            multiline
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Plaintiff invite</Text>
          <Text style={styles.helperText}>Add contact info and send a secure upload/intake link right after creating the draft case.</Text>
          <View style={styles.nameRow}>
            <TextInput
              style={[styles.textInput, styles.nameInput]}
              value={plaintiffFirstName}
              onChangeText={setPlaintiffFirstName}
              placeholder="First name"
              placeholderTextColor={colors.muted}
            />
            <TextInput
              style={[styles.textInput, styles.nameInput]}
              value={plaintiffLastName}
              onChangeText={setPlaintiffLastName}
              placeholder="Last name"
              placeholderTextColor={colors.muted}
            />
          </View>
          <TextInput
            style={styles.textInput}
            value={plaintiffEmail}
            onChangeText={setPlaintiffEmail}
            placeholder="Plaintiff email"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.textInput}
            value={plaintiffPhone}
            onChangeText={setPlaintiffPhone}
            placeholder="Plaintiff phone"
            placeholderTextColor={colors.muted}
            keyboardType="phone-pad"
          />
          <TouchableOpacity
            style={[styles.inviteToggle, sendInvite && styles.inviteToggleOn]}
            onPress={() => setSendInvite((value) => !value)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={sendInvite ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={sendInvite ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.inviteToggleText, sendInvite && styles.inviteToggleTextOn]}>
              Send invite email when case is created
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.primaryButton, saving && styles.primaryButtonDisabled]} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Create manual case</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/(app)/(tabs)/inbox')}>
          <Text style={styles.secondaryButtonText}>View cases</Text>
        </TouchableOpacity>
      </ScrollView>
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
  helperText: { marginTop: 6, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  nameRow: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  nameInput: { flex: 1 },
  textInput: {
    minHeight: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.surface,
    marginTop: space.sm,
  },
  inviteToggle: {
    marginTop: space.md,
    minHeight: 46,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  inviteToggleOn: { borderColor: colors.primary + '55', backgroundColor: colors.primary + '10' },
  inviteToggleText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  inviteToggleTextOn: { color: colors.primaryDark },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  optionPill: {
    paddingHorizontal: space.md,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statePill: {
    minWidth: 54,
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  attorneyStatePill: { borderColor: colors.primary + '55', backgroundColor: colors.primary + '08' },
  optionPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { fontSize: 14, fontWeight: '700', color: colors.text },
  optionTextActive: { color: '#fff' },
  notesInput: {
    marginTop: space.sm,
    minHeight: 130,
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  secondaryButtonText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.success + '55',
    backgroundColor: colors.successMuted,
    marginBottom: space.md,
  },
  successText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
})
