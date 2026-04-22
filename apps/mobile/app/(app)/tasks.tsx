import { useCallback, useState } from 'react'
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getApiErrorMessage, getTasksSummary, type TaskSummaryItem } from '../../src/lib/api'
import { InlineErrorBanner } from '../../src/components/InlineErrorBanner'
import { ScreenState } from '../../src/components/ScreenState'
import { colors, radii, space, shadows } from '../../src/theme/tokens'
import { formatClaimType } from '../../src/lib/formatLead'

type Section = { title: string; data: TaskSummaryItem[] }

export default function TasksScreen() {
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const s = await getTasksSummary()
      const next: Section[] = []
      if (s.overdue?.length) next.push({ title: 'Overdue', data: s.overdue })
      if (s.today?.length) next.push({ title: 'Due today', data: s.today })
      if (s.upcoming?.length) next.push({ title: 'Upcoming', data: s.upcoming })
      if (s.noDueDate?.length) next.push({ title: 'No due date', data: s.noDueDate })
      setSections(next)
    } catch (err: unknown) {
      setSections([])
      setLoadError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load])
  )

  function formatDue(iso: string | null) {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return <ScreenState title="Loading tasks" message="Checking your case deadlines." loading />
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      contentContainerStyle={sections.length === 0 ? styles.emptyContainer : styles.list}
      ListHeaderComponent={
        loadError ? <InlineErrorBanner message={loadError} onAction={() => { setLoading(true); load() }} /> : null
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />
      }
      renderSectionHeader={({ section: { title } }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(`/(app)/lead/${item.leadId}`)}
          activeOpacity={0.88}
        >
          <Text style={styles.taskTitle}>{item.title}</Text>
          <Text style={styles.meta}>
            {item.claimType ? formatClaimType(item.claimType) : 'Case'} · Due {formatDue(item.dueDate)}
          </Text>
          <View style={styles.row}>
            <Text style={styles.openCase}>Open case</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="checkbox-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyTitle}>No open tasks</Text>
          <Text style={styles.emptySub}>Tasks created on your cases will show due dates here.</Text>
        </View>
      }
    />
  )
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  emptyContainer: { flexGrow: 1, padding: space.lg },
  sectionHeader: { paddingTop: space.md, paddingBottom: space.sm, backgroundColor: colors.surface },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  taskTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { fontSize: 14, color: colors.textSecondary, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: space.md },
  openCase: { fontSize: 15, fontWeight: '700', color: colors.primary },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: space.md },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
})
