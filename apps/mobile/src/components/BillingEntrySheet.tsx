/**
 * Bottom sheet for logging time, adding a case cost, or creating an invoice —
 * the same three entries the web case workspace offers, posted to the same
 * endpoints.
 */
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {
  createCaseTime,
  createLeadExpense,
  createLeadInvoice,
  getApiErrorMessage,
} from '../lib/api'
import { colors, radii, space } from '../theme/tokens'

export type BillingEntryKind = 'time' | 'expense' | 'invoice'

const EXPENSE_CATEGORIES = [
  { value: 'filing', label: 'Filing fees' },
  { value: 'expert', label: 'Expert fees' },
  { value: 'records', label: 'Records retrieval' },
  { value: 'investigation', label: 'Investigation' },
  { value: 'deposition', label: 'Deposition' },
  { value: 'service', label: 'Service of process' },
  { value: 'other', label: 'Other' },
]

const TITLES: Record<BillingEntryKind, string> = {
  time: 'Log time',
  expense: 'Add case cost',
  invoice: 'Create invoice',
}

function today() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(value).getTime())

export function BillingEntrySheet({
  kind,
  leadId,
  activityTypes,
  onClose,
  onSaved,
}: {
  kind: BillingEntryKind | null
  leadId: string
  activityTypes: Array<{ value: string; label: string }>
  onClose: () => void
  onSaved: () => void
}) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today())
  const [choice, setChoice] = useState('')
  const [text, setText] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [billable, setBillable] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!kind) return
    setAmount('')
    setDate(kind === 'invoice' ? '' : today())
    setChoice(kind === 'time' ? activityTypes[0]?.value || 'general' : kind === 'expense' ? 'filing' : '')
    setText('')
    setInvoiceNumber('')
    setBillable(true)
    setError(null)
  }, [kind, activityTypes])

  const options = kind === 'time' ? activityTypes : kind === 'expense' ? EXPENSE_CATEGORIES : []
  const value = Number(amount)

  async function save() {
    if (!kind) return
    if (!Number.isFinite(value) || value <= 0) {
      setError(kind === 'time' ? 'Enter hours greater than 0.' : 'Enter an amount greater than 0.')
      return
    }
    if (date && !isIsoDate(date)) {
      setError('Enter the date as YYYY-MM-DD.')
      return
    }
    if (kind === 'expense' && !text.trim()) {
      setError('Describe the cost.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (kind === 'time') {
        await createCaseTime(leadId, {
          hours: value,
          activityType: choice,
          description: text.trim() || undefined,
          billable,
          workDate: date || undefined,
        })
      } else if (kind === 'expense') {
        await createLeadExpense(leadId, {
          category: choice,
          description: text.trim(),
          amount: value,
          incurredAt: date || undefined,
        })
      } else {
        await createLeadInvoice(leadId, {
          invoiceNumber: invoiceNumber.trim() || undefined,
          amount: value,
          dueDate: date || undefined,
          notes: text.trim() || undefined,
        })
      }
      onSaved()
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={Boolean(kind)} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{kind ? TITLES[kind] : ''}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.body}>
            {kind === 'invoice' && (
              <Field label="Invoice number (optional)">
                <TextInput style={styles.input} value={invoiceNumber} onChangeText={setInvoiceNumber} placeholder="INV-001" placeholderTextColor={colors.muted} />
              </Field>
            )}
            <Field label={kind === 'time' ? 'Hours' : 'Amount ($)'}>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder={kind === 'time' ? '1.5' : '250.00'}
                placeholderTextColor={colors.muted}
              />
            </Field>
            {options.length > 0 && (
              <Field label={kind === 'time' ? 'Activity' : 'Category'}>
                <View style={styles.chips}>
                  {options.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.chip, choice === option.value && styles.chipOn]}
                      onPress={() => setChoice(option.value)}
                    >
                      <Text style={[styles.chipText, choice === option.value && styles.chipTextOn]}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>
            )}
            <Field label={kind === 'time' ? 'Work date' : kind === 'expense' ? 'Date incurred' : 'Due date (optional)'}>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
              />
            </Field>
            <Field label={kind === 'expense' ? 'Description' : kind === 'time' ? 'What you worked on (optional)' : 'Notes (optional)'}>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={text}
                onChangeText={setText}
                multiline
                placeholderTextColor={colors.muted}
              />
            </Field>
            {kind === 'time' && (
              <View style={styles.switchRow}>
                <Text style={styles.label}>Billable</Text>
                <Switch value={billable} onValueChange={setBillable} />
              </View>
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancel} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.save, saving && { opacity: 0.6 }]} onPress={() => void save()} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: space.lg,
    paddingBottom: space.xl,
    maxHeight: '88%',
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: space.md },
  body: { flexGrow: 0 },
  field: { marginBottom: space.md },
  label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: space.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primary + '14' },
  chipText: { fontSize: 13, color: colors.text },
  chipTextOn: { color: colors.primaryDark, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  error: { color: colors.danger, fontSize: 13, marginBottom: space.sm },
  buttons: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
  cancel: { flex: 1, paddingVertical: 14, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700', color: colors.text },
  save: { flex: 1, paddingVertical: 14, borderRadius: radii.lg, backgroundColor: colors.primary, alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
})
