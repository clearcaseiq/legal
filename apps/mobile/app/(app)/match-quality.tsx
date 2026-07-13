import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useAttorneyDashboardData } from '../../src/contexts/AttorneyDashboardContext'
import { ScreenState } from '../../src/components/ScreenState'
import { InlineErrorBanner } from '../../src/components/InlineErrorBanner'
import { DomainBreadcrumb } from '../../src/components/DomainBreadcrumb'
import { colors, radii, space, shadows, domains } from '../../src/theme/tokens'
import { formatClaimType } from '../../src/lib/formatLead'

const ACCENT = domains.leadgen.accent

const pct = (n?: number | null) => `${Math.round((Number(n) || 0) * 100)}%`
const mins = (n?: number | null) => {
  const v = Math.round(Number(n) || 0)
  if (!v) return '—'
  if (v < 60) return `${v}m`
  const h = Math.floor(v / 60)
  const m = v % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function toneForRate(rate: number) {
  if (rate >= 0.6) return colors.success
  if (rate >= 0.35) return ACCENT
  return colors.warning
}

export default function MatchQualityScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const { data, loading, error: loadError, refresh } = useAttorneyDashboardData()

  useFocusEffect(
    useCallback(() => {
      void refresh({ force: true, silent: true })
    }, [refresh])
  )

  const payload = data as any
  const lq = payload?.leadQuality
  const ls = payload?.leadSpeed
  const dq = payload?.decisionQuality

  if (loading && !data) {
    return <ScreenState title="Loading match quality" message="Crunching your acceptance and conversion metrics." loading />
  }

  if (!lq) {
    return (
      <ScreenState
        title="No match data yet"
        message="Once leads route to you, your match-quality metrics will show up here."
        icon="stats-chart-outline"
        actionLabel={loadError ? 'Try again' : undefined}
        onAction={loadError ? () => { void refresh({ force: true }) } : undefined}
      />
    )
  }

  const byArea = Array.isArray(lq.byPracticeArea) ? lq.byPracticeArea.slice(0, 6) : []

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            void refresh({ force: true }).finally(() => setRefreshing(false))
          }}
        />
      }
    >
      <DomainBreadcrumb
        domain="leadgen"
        title="Match Quality"
        subtitle="How well your routed matches convert"
        style={styles.header}
      />

      {loadError ? <InlineErrorBanner message={loadError} onAction={() => { void refresh({ force: true }) }} /> : null}

      <View style={styles.kpiRow}>
        <Kpi label="Avg match" value={pct(lq.avgMatch)} accent={ACCENT} />
        <Kpi label="Accept rate" value={pct(lq.acceptRate)} accent={toneForRate(Number(lq.acceptRate) || 0)} />
        <Kpi label="Retain rate" value={pct(lq.retainRate)} accent={toneForRate(Number(lq.retainRate) || 0)} />
      </View>

      {ls ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Speed to lead</Text>
          <View style={styles.inlineRow}>
            <Inline label="Median response" value={mins(ls.medianResponseMinutes)} />
            <Inline label="Within 1h" value={pct(ls.within1hRate)} />
            <Inline label="Within 24h" value={pct(ls.within24hRate)} />
          </View>
          {ls.bySpeed ? (
            <Text style={styles.footnote}>
              Fast replies retain {pct(ls.bySpeed.fast?.retainRate)} vs {pct(ls.bySpeed.slow?.retainRate)} for slow ·{' '}
              {Number(ls.aging) || 0} aging undecided
            </Text>
          ) : null}
        </View>
      ) : null}

      {dq?.declined ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Decision quality</Text>
          <View style={styles.inlineRow}>
            <Inline label="Declined" value={String(dq.declined.total ?? 0)} />
            <Inline
              label="High-value declined"
              value={String(dq.declined.highViability ?? 0)}
              tone={(dq.declined.highViability ?? 0) > 0 ? colors.warning : undefined}
            />
            <Inline label="of declines" value={pct(dq.declined.highViabilityRate)} />
          </View>
          {(dq.declined.highViability ?? 0) > 0 ? (
            <Text style={styles.footnote}>
              {dq.declined.highViability} declined match{(dq.declined.highViability === 1) ? '' : 'es'} scored ≥70% viability — worth a second look.
            </Text>
          ) : (
            <Text style={styles.footnote}>No high-viability matches were declined. Good calibration.</Text>
          )}
        </View>
      ) : null}

      {byArea.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>By practice area</Text>
          {byArea.map((row: any) => (
            <View key={row.type} style={styles.areaRow}>
              <View style={styles.areaLeft}>
                <Text style={styles.areaName} numberOfLines={1}>{formatClaimType(row.type)}</Text>
                <Text style={styles.areaMeta}>
                  {row.matches} match{row.matches === 1 ? '' : 'es'} · avg {pct(row.avgMatch)}
                </Text>
              </View>
              <View style={[styles.ratePill, { backgroundColor: toneForRate(Number(row.acceptRate) || 0) + '1c' }]}>
                <Text style={[styles.rateText, { color: toneForRate(Number(row.acceptRate) || 0) }]}>{pct(row.acceptRate)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.webNote}>Full analytics — draggable time windows, firm benchmarks, and calibration tables — are on the web dashboard.</Text>
    </ScrollView>
  )
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={styles.kpiTile}>
      <Text style={[styles.kpiValue, { color: accent }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  )
}

function Inline({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.inlineItem}>
      <Text style={[styles.inlineValue, tone ? { color: tone } : null]}>{value}</Text>
      <Text style={styles.inlineLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space.lg, paddingBottom: space.xxl },
  header: { marginBottom: space.lg },
  kpiRow: { flexDirection: 'row', gap: space.md, marginBottom: space.md },
  kpiTile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  kpiValue: { fontSize: 22, fontWeight: '800' },
  kpiLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4, fontWeight: '600' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: space.lg,
    marginTop: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: space.md },
  inlineRow: { flexDirection: 'row', gap: space.md },
  inlineItem: { flex: 1 },
  inlineValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  inlineLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  footnote: { fontSize: 12, color: colors.textSecondary, marginTop: space.md, lineHeight: 18 },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  areaLeft: { flex: 1, minWidth: 0 },
  areaName: { fontSize: 15, fontWeight: '700', color: colors.text },
  areaMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  ratePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.sm },
  rateText: { fontSize: 13, fontWeight: '800' },
  webNote: { fontSize: 12, color: colors.muted, marginTop: space.lg, lineHeight: 18 },
})
