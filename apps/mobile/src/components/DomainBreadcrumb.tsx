import { View, Text, StyleSheet, type ViewStyle } from 'react-native'
import { colors, space, domains, type DomainId } from '../theme/tokens'

/**
 * Shared workspace header — mirrors the attorney web redesign's two colour-coded
 * domains (Lead Generation = blue, Case Management = emerald). Renders a
 * `ClearCaseIQ / <domain>` breadcrumb tinted with the domain accent, plus an
 * optional screen title and subtitle. Use at the top of every domain screen so
 * both areas feel like one system.
 */
export function DomainBreadcrumb({
  domain,
  title,
  subtitle,
  style,
}: {
  domain: DomainId
  title?: string
  subtitle?: string
  style?: ViewStyle
}) {
  const d = domains[domain]
  return (
    <View style={style}>
      <View style={styles.crumb}>
        <Text style={styles.brand}>ClearCaseIQ</Text>
        <Text style={styles.sep}>/</Text>
        <Text style={[styles.leaf, { color: d.accent }]}>{d.label}</Text>
      </View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  crumb: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brand: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  sep: { fontSize: 12, color: colors.muted },
  leaf: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: space.sm },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
})
