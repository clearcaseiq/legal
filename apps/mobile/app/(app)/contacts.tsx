import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  View,
  Text,
  FlatList,
  Linking,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  createCaseContact,
  createLeadContact,
  getApiErrorMessage,
  getCaseContacts,
  getFilteredAttorneyLeads,
  getLeadCaseContacts,
  type AttorneyCaseContact,
} from '../../src/lib/api'
import { InlineErrorBanner } from '../../src/components/InlineErrorBanner'
import { ScreenState } from '../../src/components/ScreenState'
import { colors, radii, space, shadows } from '../../src/theme/tokens'
import { formatClaimType, leadLabel, leadMeta } from '../../src/lib/formatLead'

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
  const [createOpen, setCreateOpen] = useState(false)
  const [leadPickerOpen, setLeadPickerOpen] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [title, setTitle] = useState('')
  const [contactType, setContactType] = useState('client')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

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

  async function openUrl(url: string, log?: { leadId?: string | null; contactType: 'call' | 'sms' | 'email'; contactMethod: string }) {
    const supported = await Linking.canOpenURL(url)
    if (supported) {
      await Linking.openURL(url)
      if (log?.leadId) {
        createLeadContact(log.leadId, {
          contactType: log.contactType,
          contactMethod: log.contactMethod,
          notes: `Quick ${log.contactType === 'sms' ? 'text' : log.contactType} action from mobile contacts.`,
        }).catch(() => {})
      }
    }
  }

  const loadLeads = useCallback(async () => {
    try {
      const response = await getFilteredAttorneyLeads({ sortBy: 'newest' })
      const rows = Array.isArray(response?.leads) ? response.leads : Array.isArray(response) ? response : []
      const activeRows = rows.filter((row: any) => !['rejected', 'declined', 'closed'].includes(String(row?.status || '').toLowerCase()))
      setLeads(activeRows)
      const fromRoute = leadId ? activeRows.find((row: any) => row.id === leadId) : null
      if (fromRoute) {
        setSelectedLead(fromRoute)
      } else if (!selectedLead && activeRows[0]) {
        setSelectedLead(activeRows[0])
      }
    } catch (err: unknown) {
      setCreateError(getApiErrorMessage(err))
    }
  }, [leadId, selectedLead])

  async function openCreateContact() {
    setCreateError(null)
    setCreateOpen(true)
    await loadLeads()
  }

  async function submitContact() {
    if (!selectedLead?.id || !firstName.trim() || !lastName.trim() || saving) return
    setSaving(true)
    setCreateError(null)
    try {
      await createCaseContact(selectedLead.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        companyName: companyName.trim() || undefined,
        title: title.trim() || undefined,
        contactType: contactType.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
      setCompanyName('')
      setTitle('')
      setContactType('client')
      setNotes('')
      setCreateOpen(false)
      await load()
    } catch (err: unknown) {
      setCreateError(getApiErrorMessage(err))
    } finally {
      setSaving(false)
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

      <View style={styles.createWrap}>
        <TouchableOpacity style={styles.createButton} onPress={() => { void openCreateContact() }} activeOpacity={0.85}>
          <Ionicons name="person-add-outline" size={20} color="#fff" />
          <Text style={styles.createButtonText}>Create contact</Text>
        </TouchableOpacity>
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
                    <TouchableOpacity style={styles.actionBtn} onPress={() => { void openUrl(`tel:${item.phone}`, { leadId: item.leadId, contactType: 'call', contactMethod: item.phone! }) }}>
                      <Ionicons name="call-outline" size={16} color={colors.primary} />
                      <Text style={styles.actionText}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => { void openUrl(`sms:${item.phone}`, { leadId: item.leadId, contactType: 'sms', contactMethod: item.phone! }) }}>
                      <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
                      <Text style={styles.actionText}>Text</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
                {item.email ? (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => { void openUrl(`mailto:${item.email}`, { leadId: item.leadId, contactType: 'email', contactMethod: item.email! }) }}>
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
      <Modal visible={createOpen} animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create contact</Text>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setCreateOpen(false)} activeOpacity={0.75}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={[{ id: 'form' }]}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.form}
            renderItem={() => (
              <View>
                {createError ? <InlineErrorBanner message={createError} onAction={() => setCreateError(null)} actionLabel="Dismiss" /> : null}
                <Text style={styles.label}>Case</Text>
                <TouchableOpacity style={styles.caseSelector} onPress={() => setLeadPickerOpen(true)} activeOpacity={0.85}>
                  <View style={styles.caseSelectorCopy}>
                    <Text style={styles.caseName}>{selectedLead ? leadLabel(selectedLead) : 'Select a case'}</Text>
                    {selectedLead ? <Text style={styles.caseMeta}>{leadMeta(selectedLead)}</Text> : null}
                  </View>
                  <Ionicons name="chevron-down" size={20} color={colors.primary} />
                </TouchableOpacity>

                <View style={styles.nameRow}>
                  <View style={styles.nameInputWrap}>
                    <Text style={[styles.label, styles.fieldGap]}>First name</Text>
                    <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First" placeholderTextColor={colors.muted} />
                  </View>
                  <View style={styles.nameInputWrap}>
                    <Text style={[styles.label, styles.fieldGap]}>Last name</Text>
                    <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last" placeholderTextColor={colors.muted} />
                  </View>
                </View>

                <Text style={[styles.label, styles.fieldGap]}>Relationship / type</Text>
                <TextInput style={styles.input} value={contactType} onChangeText={setContactType} placeholder="client, witness, provider, adjuster" placeholderTextColor={colors.muted} />

                <Text style={[styles.label, styles.fieldGap]}>Email</Text>
                <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@example.com" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="email-address" />

                <Text style={[styles.label, styles.fieldGap]}>Phone</Text>
                <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor={colors.muted} keyboardType="phone-pad" />

                <Text style={[styles.label, styles.fieldGap]}>Company</Text>
                <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} placeholder="Optional company" placeholderTextColor={colors.muted} />

                <Text style={[styles.label, styles.fieldGap]}>Title</Text>
                <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Optional title" placeholderTextColor={colors.muted} />

                <Text style={[styles.label, styles.fieldGap]}>Notes</Text>
                <TextInput style={styles.notesInput} value={notes} onChangeText={setNotes} placeholder="Optional notes" placeholderTextColor={colors.muted} multiline />

                <TouchableOpacity
                  style={[styles.submitButton, (!selectedLead?.id || !firstName.trim() || !lastName.trim() || saving) && styles.submitButtonOff]}
                  onPress={submitContact}
                  disabled={!selectedLead?.id || !firstName.trim() || !lastName.trim() || saving}
                  activeOpacity={0.85}
                >
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Create contact</Text>}
                </TouchableOpacity>
              </View>
            )}
          />

          <Modal visible={leadPickerOpen} animationType="slide" onRequestClose={() => setLeadPickerOpen(false)}>
            <View style={styles.modalScreen}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select a case</Text>
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setLeadPickerOpen(false)} activeOpacity={0.75}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={leads}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.modalList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.leadRow}
                    onPress={() => {
                      setSelectedLead(item)
                      setLeadPickerOpen(false)
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.leadTitle}>{leadLabel(item)}</Text>
                    <Text style={styles.leadMeta}>{leadMeta(item)}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </Modal>
        </View>
      </Modal>
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
  createWrap: { paddingHorizontal: space.lg, marginBottom: space.md },
  createButton: {
    minHeight: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.sm,
    ...shadows.soft,
  },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
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
  modalScreen: { flex: 1, backgroundColor: colors.surface },
  modalHeader: {
    padding: space.lg,
    paddingTop: space.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  form: { padding: space.lg, paddingBottom: space.xxl },
  label: { fontSize: 12, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldGap: { marginTop: space.lg },
  caseSelector: {
    marginTop: space.sm,
    minHeight: 56,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
  },
  caseSelectorCopy: { flex: 1 },
  caseName: { fontSize: 16, fontWeight: '800', color: colors.text },
  nameRow: { flexDirection: 'row', gap: space.sm },
  nameInputWrap: { flex: 1 },
  input: {
    marginTop: space.sm,
    minHeight: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.card,
  },
  notesInput: {
    marginTop: space.sm,
    minHeight: 96,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    color: colors.text,
    fontSize: 15,
    textAlignVertical: 'top',
    backgroundColor: colors.card,
  },
  submitButton: {
    marginTop: space.lg,
    minHeight: 54,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonOff: { opacity: 0.55 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  modalList: { padding: space.lg },
  leadRow: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  leadTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  leadMeta: { marginTop: 4, color: colors.textSecondary },
})
