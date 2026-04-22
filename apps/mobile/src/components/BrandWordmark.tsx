import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../theme/tokens'

type Props = {
  /** Login hero vs compact (account/footer) */
  variant?: 'hero' | 'compact'
}

export function BrandWordmark({ variant = 'hero' }: Props) {
  const hero = variant === 'hero'
  return (
    <View style={styles.row}>
      <Text style={[styles.clearCase, hero ? styles.clearCaseHero : styles.clearCaseCompact]}>ClearCase</Text>
      <Text style={[styles.iq, hero ? styles.iqHero : styles.iqCompact]}>IQ</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  clearCase: {
    color: '#fff',
    letterSpacing: -0.8,
    fontWeight: '700',
  },
  clearCaseHero: {
    fontSize: 38,
  },
  clearCaseCompact: {
    fontSize: 17,
    color: colors.text,
  },
  iq: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  iqHero: {
    fontSize: 38,
    color: colors.brandAccent,
    marginLeft: 1,
  },
  iqCompact: {
    fontSize: 17,
    color: colors.primaryDark,
    marginLeft: 1,
  },
})
