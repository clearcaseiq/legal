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

const money = (n?: number | null) => {
  const v = Math.round(Number(n) || 0)
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`
  return `$${v.toLocaleString()}`
}
const pct = (n?: number | null) => `${Math.round((Number(n) || 0) * 100)}%`
const roiText = (n?: number | null) => `${(Number(n) || 0).toFixed(1)}x`

export default function MarketplaceScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const { data, loading, error: loadError, refresh } = useAttorneyDashboardData()

  useFocusEffect(
    useCallback(() => {
      void refresh({ force: true, silent: true })
    }, [refresh])
  )

  const mp = (data as any)?.marketplace

  if (loading && !data) {
    return <ScreenState title="Loading marketplace" message="Tallying your routing spend and returns." loading />
  }

  if (!mp) {
    return (
      <ScreenState
        title="No marketplace activity yet"
        message="Once you buy routed cases, your spend and return metrics will appear here."
        icon="trending-up-outline"
        actionLabel={loadError ? 'Try again' : undefined}
        onAction={loadError ? () => { void refresh({ force: true }) } : undefined}
      />
    )
  }

  const funnel = (mp.funnelByWindow?.['30'] ?? mp.funnel ?? []) as Array<{ stage: string; count: number; stepConversion: number | null }>
  const maxCount = funnel.reduce((m, r) => Math.max(m, Number(r.count) || 0), 0) || 1
  const pipeline = mp.pipeline
  const progress = Math.max(0, Math.min(1, Number(pipeline?.progressPct) || 0))
  const returnGood = (Number(mp.returnOnSpend) || 0) >= 1

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
        title="Marketplace Performance"
        subtitle="What you spend to acquire cases — and what you get back"
        style={styles.header}
      />

      {loadError ? <InlineErrorBanner message={loadError} onAction={() => { void refresh({ force: true }) }} /> : null}

      <View style={styles.kpiRow}>
        <Kpi label="Routing spend" value={money(mp.routingSpend)} accent={colors.text} />
        <Kpi label="Retained value" value={money(mp.retainedValue)} accent={colors.success} />
      </View>
      <View style={styles.kpiRow}>
        <Kpi label="Return on spend" value={roiText(mp.returnOnSpend)} accent={returnGood ? colors.success : colors.warning} />
        <Kpi label="Cost / retained" value={money(mp.costPerRetained)} accent={colors.text} />
      </View>

      {pipeline ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Spend recovery</Text>
          <View style={styles.track}>
            <View style={[styles.trackFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: pipeline.recovered ? colors.success : ACCENT }]} />
          </View>
          <View style={styles.recoveryMeta}>
            <Text style={styles.recoveryLabel}>
              {pipeline.recovered ? 'Spend recovered' : `${pct(pipeline.progressPct)} of spend recovered`}
            </Text>
            <Text style={[styles.recoveryNet, { color: (Number(pipeline.netReturn) || 0) >= 0 ? colors.success : colors.danger }]}>
              {(Number(pipeline.netReturn) || 0) >= 0 ? '+' : '−'}{money(Math.abs(Number(pipeline.netReturn) || 0))} net
            </Text>
          </View>
          {(Number(pipeline.valueAtRisk) || 0) > 0 ? (
            <Text style={styles.footnote}>
              {money(pipeline.valueAtRisk)} in flight across {pipeline.valueAtRiskCases} accepted matter{pipeline.valueAtRiskCases === 1 ? '' : 's'} not yet retained.
            </Text>
          ) : null}
        </View>
      ) : null}

      {funnel.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Acquisition funnel</Text>
          <Text style={styles.cardSub}>Last 30 days</Text>
          {funnel.map((row) => (
            <View key={row.stage} style={styles.funnelRow}>
              <View style={styles.funnelHead}>
                <Text style={styles.funnelStage}>{formatClaimType(row.stage)}</Text>
                <Text style={styles.funnelCount}>
                  {row.count}
                  {row.stepConversion != null ? <Text style={styles.funnelConv}>  ·  {pct(row.stepConversion)}</Text> : null}
                </Text>
              </View>
              <View style={styles.funnelTrack}>
                <View style={[styles.funnelBar, { width: `${Math.max(4, Math.round(((Number(row.count) || 0) / maxCount) * 100))}%` }]} />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.webNote}>Full analytics — draggable acquisition windows, monthly spend-vs-return series, and per-attorney breakdowns — are on the web dashboard.</Text>
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
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  cardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, marginBottom: space.md },
  track: { height: 10, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden', marginTop: space.sm },
  trackFill: { height: 10, borderRadius: 999 },
  recoveryMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm },
  recoveryLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  recoveryNet: { fontSize: 13, fontWeight: '800' },
  footnote: { fontSize: 12, color: colors.textSecondary, marginTop: space.md, lineHeight: 18 },
  funnelRow: { marginTop: space.md },
  funnelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  funnelStage: { fontSize: 14, fontWeight: '700', color: colors.text },
  funnelCount: { fontSize: 14, fontWeight: '800', color: colors.text },
  funnelConv: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  funnelTrack: { height: 8, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden' },
  funnelBar: { height: 8, borderRadius: 999, backgroundColor: ACCENT },
  webNote: { fontSize: 12, color: colors.muted, marginTop: space.lg, lineHeight: 18 },
})
