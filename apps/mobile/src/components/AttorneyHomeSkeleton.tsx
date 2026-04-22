import { View, StyleSheet } from 'react-native'
import { colors, radii, space } from '../theme/tokens'

/**
 * Lightweight shell while the attorney dashboard payload loads (stale-while-revalidate friendly).
 */
export function AttorneyHomeSkeleton() {
  return (
    <View style={styles.wrap} accessibilityLabel="Loading home">
      <View style={[styles.block, styles.hero]} />
      <View style={[styles.block, styles.line]} />
      <View style={styles.row}>
        <View style={[styles.tile, styles.flex]} />
        <View style={[styles.tile, styles.flex]} />
      </View>
      <View style={styles.row}>
        <View style={[styles.tile, styles.flex]} />
        <View style={[styles.tile, styles.flex]} />
      </View>
      <View style={[styles.block, styles.card]} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.md },
  block: { backgroundColor: colors.border + '99', borderRadius: radii.md },
  hero: { height: 28, width: '55%' },
  line: { height: 14, width: '75%' },
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
  tile: { height: 88, borderRadius: radii.lg, backgroundColor: colors.border + '88' },
  card: { height: 120, borderRadius: radii.lg },
})
