import { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  Linking,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getApiErrorMessage, getCaseContacts, getLeadCaseContacts, type AttorneyCaseContact } from '../../src/lib/api'
import { InlineErrorBanner } from '../../src/components/InlineErrorBanner'
import { ScreenState } from '../../src/components/ScreenState'
import { colors, radii, space, shadows } from '../../src/theme/tokens'
import { formatClaimType } from '../../src/lib/formatLead'

function buildContactName(contact: AttorneyCaseContact) {
  return `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.companyName || 'Contact'
}

function buildClaimLabel(contact: AttorneyCaseContact) {
  const claim = contact.lead?.assessment?.claimType ? formatClaimType(contact.lead.assessment.claimType) : 'Case'
  const venue = [contact.lead?.assessment?.venueCounty, contact.lead?.assessment?.venueState].filter(Boolean).join(', ')
  return venue ? `${claim} · ${venue}` : claim
}

export default function ContactsScreen() {
  const { leadId } = useLocalSearchParams<{ leadId?: string }>()
  const [rows, setRows] = useState<AttorneyCaseContact[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      const data = leadId ? await getLeadCaseContacts(leadId) : await getCaseContacts()
      setRows(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      setRows([])
      setLoadError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [leadId])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load])
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((contact) =>
      [
        buildContactName(contact),
        contact.email,
        contact.phone,
        contact.companyName,
        contact.title,
        contact.contactType,
        contact.notes,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    )
  }, [query, rows])

  async function openUrl(url: string) {
    const supported = await Linking.canOpenURL(url)
    if (supported) {
      await Linking.openURL(url)
    }
  }

  if (loading) {
    return <ScreenState title="Loading contacts" message="Fetching your case contacts and relationship map." loading />
  }

  return (
    <View style={styles.screen}>
      {loadError ? (
        <View style={styles.bannerWrap}>
          <InlineErrorBanner message={loadError} onAction={() => { setLoading(true); void load() }} />
        </View>
      ) : null}

      <View style={styles.searchCard}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={leadId ? 'Search this case contact list' : 'Search people, companies, emails, phones'}
          placeholderTextColor={colors.muted}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} />
        }
        renderItem={({ item }) => {
          const name = buildContactName(item)
          const primaryMeta = [item.contactType, item.title, item.companyName].filter(Boolean).join(' · ')
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.name}>{name}</Text>
                  {primaryMeta ? <Text style={styles.meta}>{primaryMeta}</Text> : null}
                  <Text style={styles.caseMeta}>{buildClaimLabel(item)}</Text>
                </View>
              </View>
              {item.email ? <Text style={styles.detail}>{item.email}</Text> : null}
              {item.phone ? <Text style={styles.detail}>{item.phone}</Text> : null}
              {item.notes ? <Text style={styles.note}>{item.notes}</Text> : null}
              <View style={styles.actions}>
                {item.phone ? (
                  <>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => { void openUrl(`tel:${item.phone}`) }}>
                      <Ionicons name="call-outline" size={16} color={colors.primary} />
                      <Text style={styles.actionText}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => { void openUrl(`sms:${item.phone}`) }}>
                      <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
                      <Text style={styles.actionText}>Text</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
                {item.email ? (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => { void openUrl(`mailto:${item.email}`) }}>
                    <Ionicons name="mail-outline" size={16} color={colors.primary} />
                    <Text style={styles.actionText}>Email</Text>
                  </TouchableOpacity>
                ) : null}
                {item.leadId ? (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/(app)/lead/${item.leadId}`)}>
                    <Ionicons name="folder-open-outline" size={16} color={colors.primary} />
                    <Text style={styles.actionText}>Case</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>No contacts found</Text>
            <Text style={styles.emptySub}>
              {query
                ? 'Try a different name, company, email, or phone number.'
                : leadId
                  ? 'Contacts added to this case will appear here.'
                  : 'Case contacts from your matters will appear here.'}
            </Text>
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
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  emptyContainer: { flexGrow: 1, paddingHorizontal: space.lg, paddingBottom: space.xxl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  cardTop: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '15',
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: colors.primaryDark },
  cardBody: { flex: 1 },
  name: { fontSize: 17, fontWeight: '800', color: colors.text },
  meta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  caseMeta: { fontSize: 13, color: colors.primaryDark, marginTop: 4, fontWeight: '600' },
  detail: { fontSize: 14, color: colors.text, marginTop: space.sm },
  note: { fontSize: 14, color: colors.textSecondary, marginTop: space.sm, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radii.md,
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '28',
  },
  actionText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: space.md },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 21 },
})
