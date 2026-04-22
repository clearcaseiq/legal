import { useCallback, useMemo, useState } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAttorneyDashboardData } from '../../src/contexts/AttorneyDashboardContext'
import { getApiErrorMessage, getAttorneyChatRooms, getCaseContacts, type AttorneyCaseContact, type AttorneyChatRoom } from '../../src/lib/api'
import { InlineErrorBanner } from '../../src/components/InlineErrorBanner'
import { ScreenState } from '../../src/components/ScreenState'
import { colors, radii, space, shadows } from '../../src/theme/tokens'
import { formatClaimType, formatStatus } from '../../src/lib/formatLead'

type Scope = 'all' | 'cases' | 'contacts' | 'messages'
type SearchRow =
  | { id: string; rowType: 'case'; title: string; detail: string; route: string }
  | { id: string; rowType: 'contact'; title: string; detail: string; route: string }
  | { id: string; rowType: 'message'; title: string; detail: string; route: string }

export default function SearchScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('all')
  const [rooms, setRooms] = useState<AttorneyChatRoom[]>([])
  const [contacts, setContacts] = useState<AttorneyCaseContact[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const { data, loading, error, refresh } = useAttorneyDashboardData()

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      await refresh({ force: true, silent: true })
      const [contactData, roomData] = await Promise.all([getCaseContacts(), getAttorneyChatRooms()])
      setContacts(Array.isArray(contactData) ? contactData : [])
      setRooms(Array.isArray(roomData) ? roomData : [])
    } catch (err: unknown) {
      setContacts([])
      setRooms([])
      setLoadError(getApiErrorMessage(err))
    } finally {
      setRefreshing(false)
    }
  }, [refresh])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load])
  )

  const rows = useMemo<SearchRow[]>(() => {
    const q = query.trim().toLowerCase()
    const allRows: SearchRow[] = []

    for (const lead of Array.isArray(data?.recentLeads) ? data.recentLeads : []) {
      const title = [lead.assessment?.user?.firstName, lead.assessment?.user?.lastName].filter(Boolean).join(' ') || formatClaimType(lead.assessment?.claimType)
      const detail = [
        formatClaimType(lead.assessment?.claimType),
        [lead.assessment?.venueCounty, lead.assessment?.venueState].filter(Boolean).join(', '),
        formatStatus(lead.status),
      ]
        .filter(Boolean)
        .join(' · ')
      allRows.push({
        id: `case-${lead.id}`,
        rowType: 'case',
        title,
        detail,
        route: `/(app)/lead/${lead.id}`,
      })
    }

    for (const contact of contacts) {
      const title =
        `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.companyName || contact.email || 'Contact'
      const detail = [contact.contactType, contact.companyName, contact.email, contact.phone].filter(Boolean).join(' · ')
      allRows.push({
        id: `contact-${contact.id}`,
        rowType: 'contact',
        title,
        detail,
        route: contact.leadId ? `/(app)/contacts?leadId=${contact.leadId}` : '/(app)/contacts',
      })
    }

    for (const room of rooms) {
      const title = room.plaintiff?.name || 'Conversation'
      const detail = [
        room.assessment?.claimType ? formatClaimType(room.assessment.claimType) : null,
        room.lastMessage?.content,
      ]
        .filter(Boolean)
        .join(' · ')
      allRows.push({
        id: `message-${room.id}`,
        rowType: 'message',
        title,
        detail,
        route: `/(app)/chat/${room.id}`,
      })
    }

    const scoped = allRows.filter((row) => scope === 'all' || `${row.rowType}s`.startsWith(scope.slice(0, -1)))
    if (!q) return scoped
    return scoped.filter((row) => `${row.title} ${row.detail}`.toLowerCase().includes(q))
  }, [contacts, data?.recentLeads, query, rooms, scope])

  if (loading && !data) {
    return <ScreenState title="Loading search" message="Preparing cases, contacts, and conversations." loading />
  }

  return (
    <View style={styles.screen}>
      {error || loadError ? (
        <View style={styles.bannerWrap}>
          <InlineErrorBanner message={loadError || error || 'Unable to load search data.'} onAction={() => { setRefreshing(true); void load() }} />
        </View>
      ) : null}

      <View style={styles.searchCard}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search cases, contacts, or conversations"
          placeholderTextColor={colors.muted}
          autoFocus
        />
      </View>

      <View style={styles.chips}>
        {(['all', 'cases', 'contacts', 'messages'] as Scope[]).map((value) => (
          <TouchableOpacity key={value} style={[styles.chip, scope === value && styles.chipOn]} onPress={() => setScope(value)}>
            <Text style={[styles.chipText, scope === value && styles.chipTextOn]}>{value}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={rows.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(item.route as never)} activeOpacity={0.88}>
            <View style={[styles.iconWrap, item.rowType === 'case' ? styles.caseTint : item.rowType === 'contact' ? styles.contactTint : styles.messageTint]}>
              <Ionicons
                name={item.rowType === 'case' ? 'folder-open-outline' : item.rowType === 'contact' ? 'people-outline' : 'chatbubbles-outline'}
                size={18}
                color={item.rowType === 'case' ? colors.warning : item.rowType === 'contact' ? colors.primary : colors.success}
              />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.detail} numberOfLines={2}>{item.detail || 'Open result'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>No results</Text>
            <Text style={styles.emptySub}>Try a plaintiff name, contact detail, case type, company, or message phrase.</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  bannerWrap: { paddingHorizontal: space.lg, paddingTop: space.md },
  searchCard: {
    margin: space.lg,
    marginBottom: space.md,
    paddingHorizontal: space.md,
    minHeight: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    ...shadows.soft,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.lg, marginBottom: space.md },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipOn: { borderColor: colors.primary + '40', backgroundColor: colors.primary + '10' },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'capitalize' },
  chipTextOn: { color: colors.primaryDark },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  emptyContainer: { flexGrow: 1, paddingHorizontal: space.lg, paddingBottom: space.xxl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    ...shadows.soft,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caseTint: { backgroundColor: colors.warningMuted },
  contactTint: { backgroundColor: colors.primary + '10' },
  messageTint: { backgroundColor: colors.successMuted },
  cardBody: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  detail: { fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 19 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: space.md },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 21 },
})
