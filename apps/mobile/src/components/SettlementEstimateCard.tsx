import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radii, shadows, space } from '../theme/tokens'

const DISCLAIMER_SHORT = 'Estimate only · Not legal advice · Not a guarantee'

const DISCLAIMER_LONG =
  'This range is generated from the information you provided together with data from comparable reported matters. ' +
  'It is for informational purposes only. It is not legal advice, and it is not a prediction or guarantee of any legal outcome. ' +
  'Your actual result depends on evidence and decisions that are not known yet, and the range moves as records are added.'

type Props = {
  /** Formatted range, e.g. "$125,000 - $185,000". Null when there is not enough to estimate. */
  range: string | null
  /** Supporting line, e.g. where comparable matters cluster. */
  detail?: string | null
  /** Optional confidence label ("High" / "Medium" / "Low"). */
  confidence?: string | null
  label?: string
  emptyValue?: string
}

/**
 * The only way a settlement figure should reach a claimant on mobile. The
 * disclaimer lives inside the component rather than in a footer, another tab,
 * or the Terms, because on a phone this card is often the entire screen and
 * claimants rarely scroll past the number (C4).
 */
export function SettlementEstimateCard({
  range,
  detail,
  confidence,
  label = 'Estimated settlement range',
  emptyValue = 'Need more data',
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{range || emptyValue}</Text>
      <Text style={styles.basis}>Based on the information you've provided.</Text>
      <TouchableOpacity
        style={styles.disclaimerRow}
        onPress={() => Alert.alert('About this estimate', DISCLAIMER_LONG, [{ text: 'Got it' }])}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={DISCLAIMER_SHORT}
        accessibilityHint="Explains how this estimate is produced"
      >
        <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
        <Text style={styles.disclaimerText}>{DISCLAIMER_SHORT}</Text>
      </TouchableOpacity>
      {confidence ? (
        <Text style={styles.detail}>
          Confidence: <Text style={styles.detailStrong}>{confidence}</Text>
        </Text>
      ) : null}
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 6 },
  basis: { fontSize: 13, lineHeight: 18, color: colors.textSecondary, marginTop: 6 },
  disclaimerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 16, color: colors.muted, fontWeight: '600' },
  detail: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginTop: 8 },
  detailStrong: { fontWeight: '700', color: colors.text },
})
