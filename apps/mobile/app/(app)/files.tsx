import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, View, Text, FlatList, Linking, StyleSheet, TextInput, TouchableOpacity, RefreshControl } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import { getApiErrorMessage, getLeadEvidenceFiles, toAbsoluteApiUrl, uploadLeadEvidenceFile, type LeadEvidenceFile } from '../../src/lib/api'
import { InlineErrorBanner } from '../../src/components/InlineErrorBanner'
import { ScreenState } from '../../src/components/ScreenState'
import { colors, radii, space, shadows } from '../../src/theme/tokens'

function formatCategory(category?: string | null) {
  if (!category) return 'Evidence'
  return category
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function FilesScreen() {
  const { leadId } = useLocalSearchParams<{ leadId?: string }>()
  const [rows, setRows] = useState<LeadEvidenceFile[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('other')
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!leadId) return
    try {
      setLoadError(null)
      const data = await getLeadEvidenceFiles(leadId)
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
    return rows.filter((row) =>
      [row.originalName, row.filename, row.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    )
  }, [query, rows])

  async function openFile(file: LeadEvidenceFile) {
    try {
      await Linking.openURL(toAbsoluteApiUrl(file.fileUrl))
    } catch (err: unknown) {
      setLoadError(getApiErrorMessage(err))
    }
  }

  async function pickAndUpload() {
    if (!leadId || uploading) return
    setLoadError(null)
    setUploading(true)
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: [
          'image/*',
          'application/pdf',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
      })
      if (result.canceled || !result.assets?.[0]) return
      const asset = result.assets[0]
      const formData = new FormData()
      formData.append('category', category)
      formData.append('description', 'Attorney mobile upload')
      formData.append('file', {
        uri: asset.uri,
        name: asset.name || `case-file-${Date.now()}`,
        type: asset.mimeType || 'application/octet-stream',
      } as any)
      await uploadLeadEvidenceFile(leadId, formData)
      await load()
    } catch (err: unknown) {
      setLoadError(getApiErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  if (!leadId) {
    return <ScreenState title="Missing case" message="Open files from a case to review evidence and uploads." icon="document-attach-outline" />
  }

  if (loading) {
    return <ScreenState title="Loading files" message="Fetching case evidence and uploaded records." loading />
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
          placeholder="Search file names and categories"
          placeholderTextColor={colors.muted}
        />
      </View>

      <View style={styles.uploadCard}>
        <View style={styles.uploadHeader}>
          <View>
            <Text style={styles.uploadTitle}>Upload case file</Text>
            <Text style={styles.uploadSub}>Attach records, bills, reports, photos, or notes to this case.</Text>
          </View>
          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
            onPress={pickAndUpload}
            disabled={uploading}
            activeOpacity={0.85}
          >
            {uploading ? <ActivityIndicator color="#fff" /> : <Ionicons name="cloud-upload-outline" size={20} color="#fff" />}
            <Text style={styles.uploadButtonText}>{uploading ? 'Uploading' : 'Upload'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.categoryRow}>
          {['other', 'medical_records', 'bills', 'police_report', 'photos'].map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.categoryPill, category === item && styles.categoryPillActive]}
              onPress={() => setCategory(item)}
              activeOpacity={0.85}
            >
              <Text style={[styles.categoryPillText, category === item && styles.categoryPillTextActive]}>
                {formatCategory(item)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => { void openFile(item) }} activeOpacity={0.88}>
            <View style={styles.iconWrap}>
              <Ionicons name="document-attach-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.fileName}>{item.originalName || item.filename}</Text>
              <Text style={styles.meta}>
                {formatCategory(item.category)}
                {item.createdAt ? ` · ${new Date(item.createdAt).toLocaleDateString()}` : ''}
              </Text>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-attach-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>No files yet</Text>
            <Text style={styles.emptySub}>
              {query ? 'Try a different search term.' : 'Evidence uploads and supporting files will appear here.'}
            </Text>
            {!query ? (
              <TouchableOpacity style={styles.emptyAction} onPress={() => router.push('/(app)/document-requests')} activeOpacity={0.85}>
                <Text style={styles.emptyActionText}>Request documents</Text>
              </TouchableOpacity>
            ) : null}
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
  uploadCard: {
    marginHorizontal: space.lg,
    marginBottom: space.md,
    padding: space.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  uploadHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  uploadTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  uploadSub: { marginTop: 4, fontSize: 13, lineHeight: 18, color: colors.textSecondary, maxWidth: 210 },
  uploadButton: {
    minWidth: 94,
    minHeight: 42,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: space.md,
  },
  uploadButtonDisabled: { opacity: 0.65 },
  uploadButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  categoryPill: {
    paddingHorizontal: space.sm,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillActive: { backgroundColor: colors.primary + '18', borderColor: colors.primary + '55' },
  categoryPillText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  categoryPillTextActive: { color: colors.primaryDark },
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
    backgroundColor: colors.primary + '12',
  },
  cardBody: { flex: 1 },
  fileName: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: space.md },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 21 },
  emptyAction: {
    marginTop: space.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  emptyActionText: { color: '#fff', fontSize: 15, fontWeight: '800' },
})
