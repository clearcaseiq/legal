import { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAttorneyDashboardData } from '../../src/contexts/AttorneyDashboardContext'
import { InlineErrorBanner } from '../../src/components/InlineErrorBanner'
import { ScreenState } from '../../src/components/ScreenState'
import { DomainBreadcrumb } from '../../src/components/DomainBreadcrumb'
import { colors, radii, space, shadows, domains } from '../../src/theme/tokens'
import { formatClaimType } from '../../src/lib/formatLead'

const ACCENT = domains.leadgen.accent

type Lead = {
  id: string
  status?: string
  viabilityScore?: number | null
  createdAt?: string
  assessment?: {
    claimType?: string
    venueState?: string
    venueCounty?: string | null
    predictions?: Array<{ rangeLow?: number; rangeHigh?: number; median?: number }>
  }
}

function scorePct(score?: number | null) {
  if (score == null) return null
  return score <= 1 ? Math.round(score * 100) : Math.round(score)
}

function estimatedValue(lead: Lead): string | null {
  const p = lead.assessment?.predictions?.[0]
  const raw = Number(p?.median ?? p?.rangeLow ?? 0)
  if (!Number.isFinite(raw) || raw <= 0) return null
  if (raw >= 1000) return `$${(raw / 1000).toFixed(raw % 1000 === 0 ? 0 : 1)}k`
  return `$${Math.round(raw).toLocaleString()}`
}

function matchedAgo(iso?: string): string | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000))
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return `${days}d ago`
}

export default function NewMatchesScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const { data, loading, error: loadError, refresh } = useAttorneyDashboardData()

  useFocusEffect(
    useCallback(() => {
      void refresh({ force: true, silent: true })
    }, [refresh])
  )

  const leads: Lead[] = (data as any)?.recentLeads || []
  const matches = useMemo(
    () => leads.filter((l) => (l.status || '').toLowerCase() === 'submitted'),
    [leads]
  )

  if (loading && !data) {
    return <ScreenState title="Loading new matches" message="Checking for cases routed to you." loading />
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={matches.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void refresh({ force: true }).finally(() => setRefreshing(false))
            }}
          />
        }
        ListHeaderComponent={
          <View>
            <DomainBreadcrumb
              domain="leadgen"
              title="New Matches"
              subtitle="Cases matched to you, awaiting your decision"
              style={styles.header}
            />
            {loadError ? (
              <InlineErrorBanner message={loadError} onAction={() => { void refresh({ force: true }) }} />
            ) : null}
            {matches.length > 0 ? (
              <View style={styles.countPill}>
                <Ionicons name="sparkles-outline" size={15} color={ACCENT} />
                <Text style={styles.countText}>
                  {matches.length} match{matches.length === 1 ? '' : 'es'} awaiting review
                </Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const claimType = formatClaimType(item.assessment?.claimType)
          const venue = [item.assessment?.venueCounty, item.assessment?.venueState].filter(Boolean).join(', ') || '—'
          const score = scorePct(item.viabilityScore)
          const value = estimatedValue(item)
          const ago = matchedAgo(item.createdAt)
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(app)/lead/${item.id}`)}
              activeOpacity={0.88}
            >
              <View style={styles.cardTop}>
                <Text style={styles.claim}>{claimType}</Text>
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>New</Text>
                </View>
              </View>
              <Text style={styles.venue}>{venue}</Text>
              <View style={styles.metrics}>
                {score != null ? (
                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>{score}%</Text>
                    <Text style={styles.metricLabel}>Match</Text>
                  </View>
                ) : null}
                {value ? (
                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>{value}</Text>
                    <Text style={styles.metricLabel}>Est. value</Text>
                  </View>
                ) : null}
                {ago ? (
                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>{ago}</Text>
                    <Text style={styles.metricLabel}>Matched</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.cta}>
                <Text style={styles.ctaText}>Review &amp; decide</Text>
                <Ionicons name="chevron-forward" size={18} color={ACCENT} />
              </View>
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>
              {loadError ? 'Could not load matches' : "You're all caught up"}
            </Text>
            <Text style={styles.emptySub}>
              {loadError
                ? 'Use Retry above or pull down when your connection is stable.'
                : 'New cases routed to you will appear here for review. Pull down to refresh.'}
            </Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { marginBottom: space.md },
  list: { padding: space.lg, paddingBottom: space.xxl },
  emptyContainer: { flexGrow: 1, padding: space.lg },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: ACCENT + '14',
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radii.lg,
    marginBottom: space.md,
  },
  countText: { fontSize: 13, fontWeight: '700', color: ACCENT },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  claim: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1, paddingRight: space.sm },
  newBadge: { backgroundColor: ACCENT + '18', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.sm },
  newBadgeText: { fontSize: 12, fontWeight: '800', color: ACCENT },
  venue: { fontSize: 15, color: colors.textSecondary, marginTop: 6 },
  metrics: { flexDirection: 'row', gap: space.xl, marginTop: space.md },
  metric: {},
  metricValue: { fontSize: 16, fontWeight: '800', color: colors.text },
  metricLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ctaText: { fontSize: 15, fontWeight: '700', color: ACCENT },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: space.md },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 21 },
})
