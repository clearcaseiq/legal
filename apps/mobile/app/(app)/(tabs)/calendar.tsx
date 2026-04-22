import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Linking,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { useAuth } from '../../../src/contexts/AuthContext'
import { deleteEvidenceFile, getApiErrorMessage, getAttorneyAppointments, getPlaintiffCaseDashboard, getPlaintiffDocumentRequests, uploadEvidenceFile } from '../../../src/lib/api'
import { InlineErrorBanner } from '../../../src/components/InlineErrorBanner'
import { ScreenState } from '../../../src/components/ScreenState'
import {
  groupEventsByDay,
  monthBounds,
  formatMeetingType,
  formatTime,
  type AttorneyCalendarEvent,
  type DaySection,
} from '../../../src/lib/calendar'
import { colors, radii, space, shadows } from '../../../src/theme/tokens'
import { formatClaimType } from '../../../src/lib/formatLead'
import { scheduleConsultReminders } from '../../../src/lib/consultReminders'
import { buildPlaintiffCaseStageSummary } from '../../../src/lib/plaintiffCaseStage'

const PLAINTIFF_UPLOAD_CATEGORY_MAP: Record<string, string> = {
  police_report: 'police_report',
  medical_records: 'medical_records',
  injury_photos: 'photos',
  wage_loss: 'wage_loss',
  insurance: 'insurance',
  other: 'other',
}

function plaintiffUploadLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function supportsPhotoLibrary(docKey: string) {
  return docKey === 'injury_photos' || docKey === 'insurance' || docKey === 'other'
}

function isDocumentScan(docKey: string) {
  return docKey !== 'injury_photos'
}

function getCaptureGuidance(docKey: string) {
  if (docKey === 'injury_photos') {
    return {
      title: 'Best photo capture',
      tips: ['Use good lighting and keep the injury in focus.', 'Take one wide shot and one close-up if possible.'],
    }
  }

  if (docKey === 'insurance') {
    return {
      title: 'Best card/document capture',
      tips: ['Place the card or page on a dark flat surface.', 'Make sure all four corners are visible before uploading.'],
    }
  }

  return {
    title: 'Best scan capture',
    tips: ['Keep the page flat and capture all four corners.', 'For multi-page records, upload each page or section as a separate scan.'],
  }
}

function getDocumentPurposeGuidance(docKey: string) {
  if (docKey === 'injury_photos') {
    return 'Helps your attorney show visible harm, track healing over time, and support pain-and-suffering context.'
  }

  if (docKey === 'medical_records') {
    return 'Helps prove treatment, connect injuries to the incident, and support the medical side of damages.'
  }

  if (docKey === 'police_report') {
    return 'Helps clarify what happened, who was identified at the scene, and early liability facts.'
  }

  if (docKey === 'wage_loss') {
    return 'Helps document missed work, reduced income, and the financial impact of the injury.'
  }

  if (docKey === 'insurance') {
    return 'Helps confirm available coverage, policy details, and who may need to be notified or billed.'
  }

  return 'Helps your attorney fill gaps in the file and move the case review forward with fewer follow-ups.'
}

function getDocumentUrgencyGuidance(docKey: string) {
  if (docKey === 'injury_photos') {
    return 'Needed now for visible-injury review and to keep damages evidence current.'
  }

  if (docKey === 'medical_records') {
    return 'Needed now to update treatment review, case value signals, and what care is still missing from the file.'
  }

  if (docKey === 'police_report') {
    return 'Needed now for early liability review and to confirm the basic incident facts.'
  }

  if (docKey === 'wage_loss') {
    return 'Needed now to update lost-income review and the financial side of damages.'
  }

  if (docKey === 'insurance') {
    return 'Needed now for coverage review and to confirm who may be involved in payment or notice.'
  }

  return 'Needed now to close file gaps so your attorney can keep the case review moving.'
}

function getDocumentProgressGuidance(docKey: string) {
  if (docKey === 'injury_photos') {
    return 'Moves your file into stronger damages review.'
  }

  if (docKey === 'medical_records') {
    return 'Moves your file from intake toward treatment and value review.'
  }

  if (docKey === 'police_report') {
    return 'Moves your file into early liability review.'
  }

  if (docKey === 'wage_loss') {
    return 'Moves your file into fuller damages and loss review.'
  }

  if (docKey === 'insurance') {
    return 'Moves your file into coverage and payment-path review.'
  }

  return 'Moves your file closer to a fuller attorney review.'
}

function getPreviewHint(docKey: string) {
  if (docKey === 'injury_photos') {
    return 'Make sure the injury is clear and not blurry. You can retake it if needed.'
  }

  return 'Check that the page is readable edge to edge. If there are more pages, upload the next one after this.'
}

function countContiguousHighlightedFiles(data: any[], startIndex: number, highlightedIds: string[]) {
  let count = 0
  for (let idx = startIndex; idx < data.length; idx += 1) {
    if (!highlightedIds.includes(data[idx]?.id)) break
    count += 1
  }
  return count
}

function isImageFilename(name?: string | null) {
  return !!name && /\.(png|jpe?g|gif|webp|heic|heif)$/i.test(name)
}

function buildHighlightedClusterSummary(data: any[], startIndex: number, highlightedIds: string[]) {
  const clusterItems: any[] = []
  for (let idx = startIndex; idx < data.length; idx += 1) {
    if (!highlightedIds.includes(data[idx]?.id)) break
    clusterItems.push(data[idx])
  }

  const total = clusterItems.length
  const imageCount = clusterItems.filter((item) => isImageFilename(item?.originalName)).length
  const documentCount = total - imageCount
  const parts: string[] = [`${total} file${total === 1 ? '' : 's'}`]

  if (imageCount > 0) {
    parts.push(`${imageCount} image${imageCount === 1 ? '' : 's'}`)
  }
  if (documentCount > 0) {
    parts.push(`${documentCount} document${documentCount === 1 ? '' : 's'}`)
  }

  return parts.join(' · ')
}

function buildHighlightedClusterSummaryWithContext(
  data: any[],
  startIndex: number,
  highlightedIds: string[],
  label?: string | null,
  isSet?: boolean
) {
  const count = countContiguousHighlightedFiles(data, startIndex, highlightedIds)
  if (count === 0) return ''

  if (label && isSet) {
    return `${count} scan page${count === 1 ? '' : 's'} · ${formatUploadCategoryPhrase(label, count)}`
  }

  if (label && isPhotoCategoryLabel(label)) {
    return `${count} ${count === 1 ? 'photo' : 'photos'}`
  }

  return buildHighlightedClusterSummary(data, startIndex, highlightedIds)
}

function formatUploadCategoryPhrase(label: string, count: number) {
  const normalized = label.trim().toLowerCase()
  if (count !== 1) return normalized

  const singularMap: Record<string, string> = {
    'medical records': 'medical record',
    'injury photos': 'injury photo',
    'police reports': 'police report',
  }

  if (singularMap[normalized]) {
    return singularMap[normalized]
  }

  if (normalized.endsWith('s')) {
    return normalized.slice(0, -1)
  }

  return normalized
}

function isPhotoCategoryLabel(label: string) {
  return /photo/i.test(label)
}

function buildReceiptTitle(label: string, count: number) {
  return `${plaintiffUploadLabel(formatUploadCategoryPhrase(label, count))} received`
}

function buildReceiptDetail(label: string, count: number, isSet: boolean) {
  const normalizedLabel = formatUploadCategoryPhrase(label, count)

  if (isSet) {
    return `${count} scan page${count === 1 ? '' : 's'} attached for ${normalizedLabel} just now.`
  }

  if (isPhotoCategoryLabel(label)) {
    return `${count} ${count === 1 ? 'photo' : 'photos'} added to your case just now.`
  }

  return `${count} ${count === 1 ? 'upload' : 'uploads'} added to your case just now.`
}

function buildHighlightedCardSublabel(label?: string | null, isSet?: boolean) {
  if (!label) return null

  if (isSet) {
    return `${plaintiffUploadLabel(label)} scan`
  }

  return `${plaintiffUploadLabel(formatUploadCategoryPhrase(label, 1))} upload`
}

function buildHighlightedCardSublabelIcon(label?: string | null, isSet?: boolean) {
  if (isSet) return 'document-text-outline' as const
  if (label && isPhotoCategoryLabel(label)) return 'images-outline' as const
  return 'attach-outline' as const
}

function buildUploadSemanticIconColor(label?: string | null, isSet?: boolean) {
  if (isSet) return colors.primary
  if (label && isPhotoCategoryLabel(label)) return colors.success
  return colors.textSecondary
}

function buildUploadSemanticTextColor(label?: string | null, isSet?: boolean) {
  return buildUploadSemanticIconColor(label, isSet)
}

function buildUploadSemanticTintStyle(label?: string | null, isSet?: boolean) {
  if (isSet) {
    return {
      backgroundColor: colors.primary + '10',
      borderColor: colors.primary + '22',
    }
  }

  if (label && isPhotoCategoryLabel(label)) {
    return {
      backgroundColor: colors.successMuted,
      borderColor: colors.success + '22',
    }
  }

  return {
    backgroundColor: colors.card,
    borderColor: colors.border,
  }
}

function buildHighlightedClusterSummaryIcon(label?: string | null, isSet?: boolean) {
  return buildHighlightedCardSublabelIcon(label, isSet)
}

function buildReceiptIcon(label?: string | null, isSet?: boolean) {
  return buildHighlightedCardSublabelIcon(label, isSet)
}

function buildReceiptPillIcon(label?: string | null, isSet?: boolean) {
  if (isSet) return 'document-text-outline' as const
  return buildReceiptIcon(label, false)
}

function buildPreviewContextText(docKey?: string, isReplace?: boolean) {
  if (!docKey) return 'Upload'
  if (isDocumentScan(docKey)) {
    return isReplace ? 'Replacing scan page' : 'Adding scan page'
  }
  if (isPhotoCategoryLabel(docKey)) {
    return isReplace ? 'Replacing photo' : 'Adding photo'
  }
  return isReplace ? 'Replacing upload' : 'Adding upload'
}

function buildUploadSourceSemantic(docKey: string, source: 'camera' | 'photo' | 'file') {
  if (source === 'file') {
    return {
      label: 'other',
      isSet: false,
      icon: 'document-attach-outline' as const,
      intent: 'File',
    }
  }

  if (source === 'photo') {
    return {
      label: 'injury_photos',
      isSet: false,
      icon: 'images-outline' as const,
      intent: 'Photo',
    }
  }

  if (isDocumentScan(docKey)) {
    return {
      label: docKey,
      isSet: true,
      icon: 'scan-outline' as const,
      intent: 'Scan',
    }
  }

  return {
    label: 'injury_photos',
    isSet: false,
    icon: 'camera-outline' as const,
    intent: 'Photo',
  }
}

function buildRequestCaptureExpectationText(docKey: string) {
  if (isDocumentScan(docKey)) return 'Best as scan'
  if (supportsPhotoLibrary(docKey)) return 'Best as photo'
  return 'Best as file'
}

function buildPlaintiffSectionHeading(title: string) {
  if (title === 'Requested by your attorney') {
    return {
      title: 'Needed to keep your case moving',
      subtitle: 'Start with these attorney requests so the next case review is based on a fuller file.',
    }
  }

  if (title === 'Already on your case') {
    return {
      title: 'Already on your case',
      subtitle: 'Everything you have already sent and your attorney can already review.',
    }
  }

  return { title, subtitle: '' }
}

function buildDocumentTasksHeroCopy(openRequestCount: number) {
  if (openRequestCount === 0) {
    return 'You are caught up for now. If your attorney needs anything else, it will show up here with the best next evidence to send.'
  }

  return 'Send the next best records, photos, or forms from your phone so your attorney can review liability, damages, and timing with less back-and-forth.'
}

function buildClearedUploadUndoCopy(clearedState: ClearedUploadState | null) {
  if (!clearedState?.receipt) {
    return 'Upload confirmation cleared.'
  }

  const count = clearedState.highlightedFileIds.length || clearedState.receipt.fileIds.length || clearedState.receipt.items.length
  const isSet = /\s+set received$/i.test(clearedState.receipt.title)
  const baseLabel = formatUploadCategoryPhrase(
    clearedState.receipt.title
    .replace(/\s+set received$/i, '')
    .replace(/\s+received$/i, ''),
    count
  )

  if (isSet) {
    return `Cleared ${count} new ${baseLabel} scan page${count === 1 ? '' : 's'}.`
  }

  if (isPhotoCategoryLabel(baseLabel)) {
    return `Cleared ${count > 1 ? `${count} new ${baseLabel}` : `new ${baseLabel}`}.`
  }

  if (count > 1) {
    return `Cleared ${count} new ${baseLabel} uploads.`
  }

  return `Cleared new ${baseLabel} upload.`
}

function buildFileClusterKey(fileIds: string[]) {
  return fileIds.join('|')
}

function buildUploadedPagePreview(
  docKey: string,
  asset: { uri: string; name?: string | null; mimeType?: string | null },
  fileId?: string
): UploadedPagePreview {
  const labelBase = plaintiffUploadLabel(docKey)
  const isImage = (asset.mimeType || '').startsWith('image/')
  return {
    id: `${docKey}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: asset.name || `${labelBase} page`,
    uri: isImage ? asset.uri : undefined,
    isImage,
    fileId,
  }
}

type PendingImageUpload = {
  docKey: string
  source: 'camera' | 'photo'
  replacePage?: {
    id: string
    fileId?: string
    label: string
  }
  asset: {
    uri: string
    name?: string | null
    mimeType?: string | null
  }
}

type UploadedPagePreview = {
  id: string
  label: string
  uri?: string
  isImage: boolean
  fileId?: string
}

type DocumentSetSession = {
  docKey: string
  pagesUploaded: number
  pages: UploadedPagePreview[]
}

type RecentUploadReceipt = {
  title: string
  detail: string
  items: string[]
  fileIds: string[]
  label?: string | null
  isSet?: boolean
  createdAt: number
}

type ClearedUploadState = {
  receipt: RecentUploadReceipt | null
  highlightedFileIds: string[]
  collapsedUploadClusterKey: string | null
  highlightedClusterLabel?: string | null
  highlightedClusterIsSet?: boolean
  createdAt: number
}

type PlaintiffDocumentsSection = {
  title: string
  data: any[]
}

const RECEIPT_AUTO_DISMISS_MS = 8000
const FILE_HIGHLIGHT_DISMISS_MS = 12000
const CLEAR_UNDO_WINDOW_MS = 6000

export default function CalendarScreen() {
  const { user } = useAuth()

  if (user?.role === 'plaintiff') {
    return <PlaintiffDocumentsScreen />
  }

  return <AttorneyCalendarScreen />
}

function AttorneyCalendarScreen() {
  const insets = useSafeAreaInsets()
  const skipNextFocusLoadRef = useRef(false)
  const [cursor, setCursor] = useState(() => {
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth() }
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [events, setEvents] = useState<AttorneyCalendarEvent[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const { from, to } = useMemo(() => monthBounds(cursor.year, cursor.month), [cursor.year, cursor.month])

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const res = await getAttorneyAppointments(from, to)
      setEvents(res.events || [])
    } catch (err: unknown) {
      setEvents([])
      setLoadError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [from, to])

  useEffect(() => {
    setLoading(true)
    skipNextFocusLoadRef.current = true
    void load()
  }, [load])

  useFocusEffect(
    useCallback(() => {
      if (skipNextFocusLoadRef.current) {
        skipNextFocusLoadRef.current = false
        return
      }
      void load()
    }, [load])
  )

  useEffect(() => {
    if (events.length > 0) {
      void scheduleConsultReminders(events)
    }
  }, [events])

  const sections = useMemo(() => groupEventsByDay(events), [events])

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  function shiftMonth(delta: number) {
    const d = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
  }

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <View style={styles.monthBar}>
        <TouchableOpacity onPress={() => shiftMonth(-1)} accessibilityLabel="Previous month" hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => shiftMonth(1)} accessibilityLabel="Next month" hitSlop={12}>
          <Ionicons name="chevron-forward" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ScreenState title="Loading calendar" message="Syncing upcoming consultations." loading />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                load()
              }}
            />
          }
          contentContainerStyle={sections.length === 0 ? styles.emptyContainer : styles.listPad}
          ListHeaderComponent={
            loadError ? <InlineErrorBanner message={loadError} onAction={() => { setLoading(true); load() }} /> : null
          }
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }: { section: DaySection }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => <MeetingRow event={item} />}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={44} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No meetings this month</Text>
              <Text style={styles.emptySub}>
                Scheduled consultations from your cases appear here. Schedule from the web app or when you add a consult on a case.
              </Text>
            </View>
          }
        />
      )}
    </View>
  )
}

function PlaintiffDocumentsScreen() {
  const listRef = useRef<SectionList<any, PlaintiffDocumentsSection> | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [summary, setSummary] = useState<{ claimType?: string; files?: Array<{ id: string; originalName?: string; createdAt?: string }> } | null>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [uploadingAction, setUploadingAction] = useState<string | null>(null)
  const [pendingImageUpload, setPendingImageUpload] = useState<PendingImageUpload | null>(null)
  const [documentSetSession, setDocumentSetSession] = useState<DocumentSetSession | null>(null)
  const [showFinishSetConfirm, setShowFinishSetConfirm] = useState(false)
  const [recentUploadReceipt, setRecentUploadReceipt] = useState<RecentUploadReceipt | null>(null)
  const [highlightedFileIds, setHighlightedFileIds] = useState<string[]>([])
  const [highlightedClusterLabel, setHighlightedClusterLabel] = useState<string | null>(null)
  const [highlightedClusterIsSet, setHighlightedClusterIsSet] = useState(false)
  const [collapsedUploadClusterKey, setCollapsedUploadClusterKey] = useState<string | null>(null)
  const [recentlyClearedUploadState, setRecentlyClearedUploadState] = useState<ClearedUploadState | null>(null)
  const openRequestCount = requests.filter((request) => request.status !== 'completed').length
  const caseStageSummary = useMemo(() => buildPlaintiffCaseStageSummary({ documentRequests: requests }), [requests])

  const sections = useMemo<PlaintiffDocumentsSection[]>(
    () => [
      { title: 'Requested by your attorney', data: requests },
      { title: 'Already on your case', data: summary?.files || [] },
    ],
    [requests, summary?.files]
  )
  const currentUploadClusterKey = useMemo(() => buildFileClusterKey(highlightedFileIds), [highlightedFileIds])
  const justAddedExpanded = !currentUploadClusterKey || collapsedUploadClusterKey !== currentUploadClusterKey

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      const dashboard = await getPlaintiffCaseDashboard()
      const activeCase = dashboard?.cases?.[0]

      if (!activeCase?.id) {
        setAssessmentId(null)
        setSummary(null)
        setRequests([])
        return
      }

      setAssessmentId(activeCase.id)
      setSummary({
        claimType: activeCase.claimType,
        files: Array.isArray(activeCase.files) ? activeCase.files : [],
      })

      const docData = await getPlaintiffDocumentRequests(activeCase.id)
      setRequests(Array.isArray(docData.requests) ? docData.requests : [])
    } catch (err: unknown) {
      setSummary(null)
      setRequests([])
      setLoadError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const uploadAsset = useCallback(async (
    docKey: string,
    asset: { uri: string; name?: string | null; mimeType?: string | null },
    uploadMethod: string
  ) => {
    const formData = new FormData()
    formData.append('assessmentId', assessmentId || '')
    formData.append('category', PLAINTIFF_UPLOAD_CATEGORY_MAP[docKey] || 'other')
    formData.append('uploadMethod', uploadMethod)
    formData.append(
      'file',
      {
        uri: asset.uri,
        name: asset.name || `${docKey}-${Date.now()}.jpg`,
        type: asset.mimeType || 'application/octet-stream',
      } as any
    )
    return await uploadEvidenceFile(formData)
  }, [assessmentId])

  const registerUploadSuccess = useCallback((
    docKey: string,
    successText: string,
    asset?: { uri: string; name?: string | null; mimeType?: string | null },
    fileId?: string
  ) => {
    setActionMessage({
      tone: 'success',
      text: successText,
    })

    if (isDocumentScan(docKey)) {
      const nextPreview = asset ? buildUploadedPagePreview(docKey, asset, fileId) : null
      setDocumentSetSession((current) =>
        current?.docKey === docKey
          ? {
              ...current,
              pagesUploaded: current.pagesUploaded + 1,
              pages: nextPreview ? [...current.pages, nextPreview] : current.pages,
            }
          : {
              docKey,
              pagesUploaded: 1,
              pages: nextPreview ? [nextPreview] : [],
            }
      )
      return
    }

    setRecentUploadReceipt({
      title: buildReceiptTitle(docKey, 1),
      detail: buildReceiptDetail(docKey, 1, false),
      items: [asset?.name || plaintiffUploadLabel(docKey)],
      fileIds: fileId ? [fileId] : [],
      label: docKey,
      isSet: false,
      createdAt: Date.now(),
    })
    setHighlightedFileIds(fileId ? [fileId] : [])
    setHighlightedClusterLabel(docKey)
    setHighlightedClusterIsSet(false)
    setCollapsedUploadClusterKey(null)
    setRecentlyClearedUploadState(null)
    setDocumentSetSession(null)
  }, [])

  const finishDocumentSet = useCallback(() => {
    if (!documentSetSession) return
    setActionMessage({
      tone: 'success',
      text: `${plaintiffUploadLabel(documentSetSession.docKey)} set saved with ${documentSetSession.pagesUploaded} page${documentSetSession.pagesUploaded === 1 ? '' : 's'}.`,
    })
    setRecentUploadReceipt({
      title: `${plaintiffUploadLabel(formatUploadCategoryPhrase(documentSetSession.docKey, documentSetSession.pagesUploaded))} set received`,
      detail: buildReceiptDetail(documentSetSession.docKey, documentSetSession.pagesUploaded, true),
      items: documentSetSession.pages.map((page, index) => page.label || `Page ${index + 1}`),
      fileIds: documentSetSession.pages.map((page) => page.fileId).filter((fileId): fileId is string => !!fileId),
      label: documentSetSession.docKey,
      isSet: true,
      createdAt: Date.now(),
    })
    setHighlightedFileIds(documentSetSession.pages.map((page) => page.fileId).filter((fileId): fileId is string => !!fileId))
    setHighlightedClusterLabel(documentSetSession.docKey)
    setHighlightedClusterIsSet(true)
    setCollapsedUploadClusterKey(null)
    setRecentlyClearedUploadState(null)
    setShowFinishSetConfirm(false)
    setDocumentSetSession(null)
  }, [documentSetSession])

  const requestFinishDocumentSet = useCallback(() => {
    if (!documentSetSession || uploadingAction) return
    setShowFinishSetConfirm(true)
  }, [documentSetSession, uploadingAction])

  const removeDocumentSetPage = useCallback(async (pageId: string, pageLabel: string, fileId?: string) => {
    if (!documentSetSession || uploadingAction) return
    if (!fileId) {
      setActionMessage({
        tone: 'error',
        text: 'This page cannot be removed right now. Try refreshing and uploading again.',
      })
      return
    }

    setUploadingAction(`${documentSetSession.docKey}:remove:${pageId}`)
    try {
      await deleteEvidenceFile(fileId)
      setDocumentSetSession((current) => {
        if (!current || current.docKey !== documentSetSession.docKey) return current
        const nextPages = current.pages.filter((page) => page.id !== pageId)
        if (nextPages.length === 0) return null
        return {
          ...current,
          pagesUploaded: nextPages.length,
          pages: nextPages,
        }
      })
      setActionMessage({
        tone: 'success',
        text: `${pageLabel} removed from this document set.`,
      })
      setShowFinishSetConfirm(false)
      await load()
    } catch (err: unknown) {
      setActionMessage({
        tone: 'error',
        text: getApiErrorMessage(err),
      })
    } finally {
      setUploadingAction(null)
    }
  }, [documentSetSession, load, uploadingAction])

  const replaceDocumentSetPageAsset = useCallback(async (
    pageId: string,
    pageLabel: string,
    oldFileId: string | undefined,
    asset: { uri: string; name?: string | null; mimeType?: string | null },
    uploadMethod: string
  ) => {
    if (!documentSetSession) return
    if (!oldFileId) {
      setActionMessage({
        tone: 'error',
        text: 'This page cannot be replaced right now. Try refreshing and uploading again.',
      })
      return
    }

    const uploadedFile = await uploadAsset(documentSetSession.docKey, asset, uploadMethod)
    try {
      await deleteEvidenceFile(oldFileId)
    } catch (error) {
      if (uploadedFile?.id) {
        try {
          await deleteEvidenceFile(uploadedFile.id)
        } catch {
          // Best-effort rollback if replacement cleanup also fails.
        }
      }
      throw error
    }

    setDocumentSetSession((current) => {
      if (!current || current.docKey !== documentSetSession.docKey) return current
      return {
        ...current,
        pages: current.pages.map((page) =>
          page.id === pageId
            ? {
                ...buildUploadedPagePreview(documentSetSession.docKey, asset, uploadedFile?.id),
                id: pageId,
              }
            : page
        ),
      }
    })
    setActionMessage({
      tone: 'success',
      text: `${pageLabel} replaced successfully.`,
    })
    setShowFinishSetConfirm(false)
    await load()
  }, [documentSetSession, load, uploadAsset])

  const finalizeImageUpload = useCallback(async () => {
    if (!pendingImageUpload || !assessmentId || uploadingAction) return
    const { docKey, asset, source, replacePage } = pendingImageUpload
    setUploadingAction(replacePage ? `${docKey}:replace:${replacePage.id}:confirm` : `${docKey}:${source}:confirm`)
    try {
      if (replacePage) {
        await replaceDocumentSetPageAsset(
          replacePage.id,
          replacePage.label,
          replacePage.fileId,
          asset,
          source === 'camera' ? 'camera_retake' : 'photo_library_replace'
        )
      } else {
        const uploadedFile = await uploadAsset(docKey, asset, source === 'camera' ? 'camera_capture' : 'photo_library')
        registerUploadSuccess(docKey, `${plaintiffUploadLabel(docKey)} uploaded successfully.`, asset, uploadedFile?.id)
      }
      setPendingImageUpload(null)
    } catch (err: unknown) {
      setActionMessage({
        tone: 'error',
        text: getApiErrorMessage(err),
      })
    } finally {
      setUploadingAction(null)
    }
  }, [assessmentId, pendingImageUpload, registerUploadSuccess, replaceDocumentSetPageAsset, uploadAsset, uploadingAction])

  const replaceDocumentSetPageWithFile = useCallback(async (
    pageId: string,
    pageLabel: string,
    oldFileId?: string
  ) => {
    if (!assessmentId || uploadingAction || !documentSetSession) return
    setActionMessage(null)
    setUploadingAction(`${documentSetSession.docKey}:replace:${pageId}:file`)
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

      if (result.canceled || !result.assets?.[0]) {
        return
      }

      await replaceDocumentSetPageAsset(pageId, pageLabel, oldFileId, result.assets[0], 'document_picker_replace')
    } catch (err: unknown) {
      setActionMessage({
        tone: 'error',
        text: getApiErrorMessage(err),
      })
    } finally {
      setUploadingAction(null)
    }
  }, [assessmentId, documentSetSession, replaceDocumentSetPageAsset, uploadingAction])

  const pickAndUpload = useCallback(async (docKey: string) => {
    if (!assessmentId || uploadingAction) return
    setActionMessage(null)
    setUploadingAction(`${docKey}:file`)
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

      if (result.canceled || !result.assets?.[0]) {
        return
      }

      const uploadedFile = await uploadAsset(docKey, result.assets[0], 'document_picker')
      registerUploadSuccess(docKey, `${plaintiffUploadLabel(docKey)} uploaded. Your case summary will refresh now.`, result.assets[0], uploadedFile?.id)
      await load()
    } catch (err: unknown) {
      setActionMessage({
        tone: 'error',
        text: getApiErrorMessage(err),
      })
    } finally {
      setUploadingAction(null)
    }
  }, [assessmentId, load, registerUploadSuccess, uploadAsset, uploadingAction])

  const captureAndUpload = useCallback(async (
    docKey: string,
    replacePage?: {
      id: string
      fileId?: string
      label: string
    }
  ) => {
    if (!assessmentId || uploadingAction) return
    setActionMessage(null)
    setUploadingAction(replacePage ? `${docKey}:replace:${replacePage.id}:camera` : `${docKey}:camera`)
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        setActionMessage({
          tone: 'error',
          text: 'Camera permission is required to take photos or scan records in the app.',
        })
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      })

      if (result.canceled || !result.assets?.[0]) {
        return
      }

      setPendingImageUpload({
        docKey,
        source: 'camera',
        replacePage,
        asset: {
          uri: result.assets[0].uri,
          name: result.assets[0].fileName || `${docKey}-${Date.now()}.jpg`,
          mimeType: result.assets[0].mimeType || 'image/jpeg',
        },
      })
    } catch (err: unknown) {
      setActionMessage({
        tone: 'error',
        text: getApiErrorMessage(err),
      })
    } finally {
      setUploadingAction(null)
    }
  }, [assessmentId, load, uploadAsset, uploadingAction])

  const pickPhotoAndUpload = useCallback(async (docKey: string) => {
    if (!assessmentId || uploadingAction) return
    setActionMessage(null)
    setUploadingAction(`${docKey}:photo`)
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        setActionMessage({
          tone: 'error',
          text: 'Photo library permission is required to choose an existing image.',
        })
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
        allowsMultipleSelection: false,
      })

      if (result.canceled || !result.assets?.[0]) {
        return
      }

      setPendingImageUpload({
        docKey,
        source: 'photo',
        asset: {
          uri: result.assets[0].uri,
          name: result.assets[0].fileName || `${docKey}-${Date.now()}.jpg`,
          mimeType: result.assets[0].mimeType || 'image/jpeg',
        },
      })
    } catch (err: unknown) {
      setActionMessage({
        tone: 'error',
        text: getApiErrorMessage(err),
      })
    } finally {
      setUploadingAction(null)
    }
  }, [assessmentId, load, uploadAsset, uploadingAction])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load])
  )

  useEffect(() => {
    if (!documentSetSession) {
      setShowFinishSetConfirm(false)
    }
  }, [documentSetSession])

  useEffect(() => {
    if (!recentUploadReceipt) return
    const timeoutId = setTimeout(() => {
      setRecentUploadReceipt((current) =>
        current?.createdAt === recentUploadReceipt.createdAt ? null : current
      )
    }, RECEIPT_AUTO_DISMISS_MS)

    return () => clearTimeout(timeoutId)
  }, [recentUploadReceipt])

  useEffect(() => {
    if (highlightedFileIds.length === 0) return
    const timeoutId = setTimeout(() => {
      setHighlightedFileIds((current) =>
        current.join('|') === highlightedFileIds.join('|') ? [] : current
      )
    }, FILE_HIGHLIGHT_DISMISS_MS)

    return () => clearTimeout(timeoutId)
  }, [highlightedFileIds])

  useEffect(() => {
    if (highlightedFileIds.length === 0) {
      setHighlightedClusterLabel(null)
      setHighlightedClusterIsSet(false)
      setCollapsedUploadClusterKey(null)
    }
  }, [highlightedFileIds])

  useEffect(() => {
    if (!recentlyClearedUploadState) return
    const timeoutId = setTimeout(() => {
      setRecentlyClearedUploadState((current) =>
        current?.createdAt === recentlyClearedUploadState.createdAt ? null : current
      )
    }, CLEAR_UNDO_WINDOW_MS)

    return () => clearTimeout(timeoutId)
  }, [recentlyClearedUploadState])

  const toggleJustAddedCluster = useCallback(() => {
    if (!currentUploadClusterKey) return
    setCollapsedUploadClusterKey((current) =>
      current === currentUploadClusterKey ? null : currentUploadClusterKey
    )
  }, [currentUploadClusterKey])

  const clearJustAddedCluster = useCallback(() => {
    setRecentlyClearedUploadState({
      receipt: recentUploadReceipt,
      highlightedFileIds,
      highlightedClusterLabel,
      highlightedClusterIsSet,
      collapsedUploadClusterKey,
      createdAt: Date.now(),
    })
    setRecentUploadReceipt(null)
    setHighlightedFileIds([])
    setHighlightedClusterLabel(null)
    setHighlightedClusterIsSet(false)
    setCollapsedUploadClusterKey(null)
  }, [collapsedUploadClusterKey, highlightedClusterIsSet, highlightedClusterLabel, highlightedFileIds, recentUploadReceipt])

  const undoClearJustAddedCluster = useCallback(() => {
    if (!recentlyClearedUploadState) return
    setRecentUploadReceipt(recentlyClearedUploadState.receipt)
    setHighlightedFileIds(recentlyClearedUploadState.highlightedFileIds)
    setHighlightedClusterLabel(recentlyClearedUploadState.highlightedClusterLabel || null)
    setHighlightedClusterIsSet(!!recentlyClearedUploadState.highlightedClusterIsSet)
    setCollapsedUploadClusterKey(recentlyClearedUploadState.collapsedUploadClusterKey)
    setRecentlyClearedUploadState(null)
  }, [recentlyClearedUploadState])

  const jumpToLatestUploads = useCallback(() => {
    const uploadedFiles = summary?.files || []
    const receiptFileIds = recentUploadReceipt?.fileIds || []
    if (uploadedFiles.length === 0) return

    const targetIndex = receiptFileIds.length > 0
      ? Math.max(0, uploadedFiles.findIndex((file) => receiptFileIds.includes(file.id)))
      : 0

    listRef.current?.scrollToLocation({
      sectionIndex: 1,
      itemIndex: targetIndex >= 0 ? targetIndex : 0,
      viewOffset: 16,
      animated: true,
    })
    setRecentUploadReceipt(null)
  }, [recentUploadReceipt?.fileIds, summary?.files])

  if (loading) {
    return <ScreenState title="Loading documents" message="Checking requested uploads and the files already on your case." loading />
  }

  if (loadError && !summary) {
    return (
      <ScreenState
        title="Unable to load documents"
        message={loadError}
        icon="warning-outline"
        actionLabel="Retry"
        onAction={() => {
          setLoading(true)
          void load()
        }}
      />
    )
  }

  return (
    <>
      <SectionList<any, PlaintiffDocumentsSection>
        ref={listRef}
        style={styles.screen}
        sections={sections}
        keyExtractor={(item: any) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void load()
            }}
          />
        }
        ListHeaderComponent={
          <View style={styles.plaintiffHeaderWrap}>
            {loadError ? <InlineErrorBanner message={loadError} onAction={() => { setLoading(true); void load() }} /> : null}
            {actionMessage ? (
              <View style={[styles.notice, actionMessage.tone === 'success' ? styles.noticeSuccess : styles.noticeError]}>
                <Text style={styles.noticeText}>{actionMessage.text}</Text>
              </View>
            ) : null}
            {recentlyClearedUploadState ? (
              <View style={styles.undoNotice}>
                <View style={styles.undoNoticeRow}>
                  <Ionicons
                    name={buildReceiptIcon(
                      recentlyClearedUploadState.highlightedClusterLabel,
                      recentlyClearedUploadState.highlightedClusterIsSet
                    )}
                    size={14}
                    color={buildUploadSemanticIconColor(
                      recentlyClearedUploadState.highlightedClusterLabel,
                      recentlyClearedUploadState.highlightedClusterIsSet
                    )}
                  />
                  <Text style={styles.undoNoticeText}>{buildClearedUploadUndoCopy(recentlyClearedUploadState)}</Text>
                </View>
                <TouchableOpacity onPress={undoClearJustAddedCluster} activeOpacity={0.8}>
                  <Text style={styles.undoNoticeAction}>Undo</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {recentUploadReceipt ? (
              <View style={styles.receiptCard}>
                <View style={styles.receiptTop}>
                  <View
                    style={[
                      styles.receiptContextRow,
                      buildUploadSemanticTintStyle(recentUploadReceipt.label, recentUploadReceipt.isSet),
                    ]}
                  >
                    <Ionicons
                      name={buildReceiptIcon(recentUploadReceipt.label, recentUploadReceipt.isSet)}
                      size={15}
                      color={buildUploadSemanticIconColor(recentUploadReceipt.label, recentUploadReceipt.isSet)}
                    />
                    <Text
                      style={[
                        styles.receiptContextText,
                        { color: buildUploadSemanticTextColor(recentUploadReceipt.label, recentUploadReceipt.isSet) },
                      ]}
                    >
                      {recentUploadReceipt.isSet ? 'Scan batch' : isPhotoCategoryLabel(recentUploadReceipt.label || '') ? 'Photo upload' : 'Upload'}
                    </Text>
                  </View>
                  <View style={styles.receiptBadge}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                    <Text style={styles.receiptBadgeText}>Received just now</Text>
                  </View>
                </View>
                <Text style={styles.receiptTitle}>{recentUploadReceipt.title}</Text>
                <Text style={styles.receiptCopy}>{recentUploadReceipt.detail}</Text>
                <View style={styles.receiptRow}>
                  {recentUploadReceipt.items.map((item, index) => (
                    <View
                      key={`${item}-${index}`}
                      style={[
                        styles.receiptPill,
                        buildUploadSemanticTintStyle(recentUploadReceipt.label, recentUploadReceipt.isSet),
                      ]}
                    >
                      <Ionicons
                        name={buildReceiptPillIcon(recentUploadReceipt.label, recentUploadReceipt.isSet)}
                        size={13}
                        color={buildUploadSemanticIconColor(recentUploadReceipt.label, recentUploadReceipt.isSet)}
                      />
                      <Text
                        style={[
                          styles.receiptPillText,
                          { color: buildUploadSemanticTextColor(recentUploadReceipt.label, recentUploadReceipt.isSet) },
                        ]}
                      >
                        {recentUploadReceipt.items.length > 1 ? `p${index + 1}` : item}
                      </Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity style={styles.receiptAction} onPress={jumpToLatestUploads}>
                  <Text style={styles.receiptActionText}>View latest uploads</Text>
                  <Ionicons name="arrow-down-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ) : null}
            <View style={styles.plaintiffDocsHero}>
              <Text style={styles.monthTitle}>Document tasks</Text>
              <Text style={styles.meta}>
                {formatClaimType(summary?.claimType)} · {openRequestCount === 0 ? 'All caught up' : `${openRequestCount} open request${openRequestCount === 1 ? '' : 's'}`}
              </Text>
              <Text style={styles.notes}>{buildDocumentTasksHeroCopy(openRequestCount)}</Text>
            </View>
            <View style={styles.caseStageCard}>
              <View
                style={[
                  styles.caseStageChip,
                  buildUploadSemanticTintStyle(caseStageSummary.label, caseStageSummary.isSet),
                ]}
              >
                <Ionicons
                  name={caseStageSummary.icon}
                  size={14}
                  color={buildUploadSemanticIconColor(caseStageSummary.label, caseStageSummary.isSet)}
                />
                <Text
                  style={[
                    styles.caseStageChipText,
                    { color: buildUploadSemanticTextColor(caseStageSummary.label, caseStageSummary.isSet) },
                  ]}
                >
                  Case stage
                </Text>
              </View>
              <Text style={styles.caseStageTitle}>{caseStageSummary.title}</Text>
              <Text style={styles.caseStageCopy}>{caseStageSummary.detail}</Text>
            </View>
            {documentSetSession ? (
              <View style={styles.documentSetCard}>
                <Text style={styles.documentSetTitle}>
                  {plaintiffUploadLabel(documentSetSession.docKey)} set in progress
                </Text>
                <View
                  style={[
                    styles.documentSetContextChip,
                    buildUploadSemanticTintStyle(documentSetSession.docKey, true),
                  ]}
                >
                  <Ionicons
                    name={buildReceiptIcon(documentSetSession.docKey, true)}
                    size={14}
                    color={buildUploadSemanticIconColor(documentSetSession.docKey, true)}
                  />
                  <Text
                    style={[
                      styles.documentSetContextText,
                      { color: buildUploadSemanticTextColor(documentSetSession.docKey, true) },
                    ]}
                  >
                    Scan session
                  </Text>
                </View>
                <Text style={styles.documentSetCopy}>
                  {documentSetSession.pagesUploaded} page{documentSetSession.pagesUploaded === 1 ? '' : 's'} uploaded so far. Add the next page now or finish this set.
                </Text>
                {documentSetSession.pages.length > 0 ? (
                  <View style={styles.documentSetPreviewRow}>
                    {documentSetSession.pages.map((page, index) => (
                      <View key={page.id} style={styles.documentSetPreviewItem}>
                        {page.isImage ? (
                          <View style={styles.documentSetThumbWrap}>
                            <Image source={{ uri: page.uri }} style={styles.documentSetThumb} resizeMode="cover" />
                            <Text style={styles.documentSetThumbLabel}>p{index + 1}</Text>
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.documentSetFilePill,
                              buildUploadSemanticTintStyle(documentSetSession.docKey, true),
                            ]}
                          >
                            <Ionicons
                              name="document-text-outline"
                              size={14}
                              color={buildUploadSemanticIconColor(documentSetSession.docKey, true)}
                            />
                            <Text
                              style={[
                                styles.documentSetFileText,
                                { color: buildUploadSemanticTextColor(documentSetSession.docKey, true) },
                              ]}
                            >
                              p{index + 1}
                            </Text>
                          </View>
                        )}
                        <View style={styles.documentSetPageActionRow}>
                          <TouchableOpacity
                            style={[
                              styles.documentSetPageReplaceButton,
                              buildUploadSemanticTintStyle(documentSetSession.docKey, true),
                              uploadingAction === `${documentSetSession.docKey}:replace:${page.id}:camera` && styles.uploadTaskButtonDisabled,
                            ]}
                            onPress={() => {
                              void captureAndUpload(documentSetSession.docKey, {
                                id: page.id,
                                fileId: page.fileId,
                                label: `Page ${index + 1}`,
                              })
                            }}
                            disabled={uploadingAction !== null}
                          >
                            {uploadingAction === `${documentSetSession.docKey}:replace:${page.id}:camera` ? (
                              <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                              <Ionicons
                                name="camera-outline"
                                size={14}
                                color={buildUploadSemanticIconColor(documentSetSession.docKey, true)}
                              />
                            )}
                            <Text
                              style={[
                                styles.documentSetPageReplaceText,
                                { color: buildUploadSemanticTextColor(documentSetSession.docKey, true) },
                              ]}
                            >
                              Retake
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.documentSetPageReplaceButton,
                              buildUploadSemanticTintStyle(documentSetSession.docKey, true),
                              uploadingAction === `${documentSetSession.docKey}:replace:${page.id}:file` && styles.uploadTaskButtonDisabled,
                            ]}
                            onPress={() => { void replaceDocumentSetPageWithFile(page.id, `Page ${index + 1}`, page.fileId) }}
                            disabled={uploadingAction !== null}
                          >
                            {uploadingAction === `${documentSetSession.docKey}:replace:${page.id}:file` ? (
                              <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                              <Ionicons
                                name="document-attach-outline"
                                size={14}
                                color={buildUploadSemanticIconColor(documentSetSession.docKey, true)}
                              />
                            )}
                            <Text
                              style={[
                                styles.documentSetPageReplaceText,
                                { color: buildUploadSemanticTextColor(documentSetSession.docKey, true) },
                              ]}
                            >
                              Replace
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.documentSetPageRemoveButton,
                              uploadingAction === `${documentSetSession.docKey}:remove:${page.id}` && styles.uploadTaskButtonDisabled,
                            ]}
                            onPress={() => { void removeDocumentSetPage(page.id, `Page ${index + 1}`, page.fileId) }}
                            disabled={uploadingAction !== null}
                          >
                            {uploadingAction === `${documentSetSession.docKey}:remove:${page.id}` ? (
                              <ActivityIndicator size="small" color={colors.danger} />
                            ) : (
                              <Ionicons name="close-outline" size={14} color={colors.danger} />
                            )}
                            <Text style={styles.documentSetPageRemoveText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
                <View style={styles.documentSetActions}>
                  <TouchableOpacity
                    style={[
                      styles.documentSetButton,
                      buildUploadSemanticTintStyle(documentSetSession.docKey, true),
                      uploadingAction === `${documentSetSession.docKey}:camera` && styles.uploadTaskButtonDisabled,
                    ]}
                    onPress={() => { void captureAndUpload(documentSetSession.docKey) }}
                    disabled={uploadingAction !== null}
                  >
                    <Ionicons
                      name="camera-outline"
                      size={16}
                      color={buildUploadSemanticIconColor(documentSetSession.docKey, true)}
                    />
                    <Text
                      style={[
                        styles.documentSetButtonText,
                        { color: buildUploadSemanticTextColor(documentSetSession.docKey, true) },
                      ]}
                    >
                      Next page
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.documentSetButton,
                      buildUploadSemanticTintStyle(documentSetSession.docKey, true),
                      uploadingAction === `${documentSetSession.docKey}:file` && styles.uploadTaskButtonDisabled,
                    ]}
                    onPress={() => { void pickAndUpload(documentSetSession.docKey) }}
                    disabled={uploadingAction !== null}
                  >
                    <Ionicons
                      name="document-attach-outline"
                      size={16}
                      color={buildUploadSemanticIconColor(documentSetSession.docKey, true)}
                    />
                    <Text
                      style={[
                        styles.documentSetButtonText,
                        { color: buildUploadSemanticTextColor(documentSetSession.docKey, true) },
                      ]}
                    >
                      Choose file
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.documentSetDoneButton}
                    onPress={requestFinishDocumentSet}
                    disabled={uploadingAction !== null}
                  >
                    <Text style={styles.documentSetDoneText}>Finish set</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        }
        contentContainerStyle={(requests.length === 0 && (summary?.files?.length || 0) === 0) ? styles.emptyContainer : styles.listPad}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => {
          const heading = buildPlaintiffSectionHeading(section.title)
          return section.data.length > 0 ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{heading.title}</Text>
              {heading.subtitle ? <Text style={styles.sectionSubtitle}>{heading.subtitle}</Text> : null}
            </View>
          ) : null
        }}
        renderItem={({ item, section, index }) =>
          section.title === 'Requested by your attorney' ? (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.plaintiff}>{item.attorney?.name || 'Your attorney'}</Text>
                <View style={styles.typePill}>
                  <Text style={styles.typePillText}>{item.status === 'completed' ? 'Completed' : 'Action needed'}</Text>
                </View>
              </View>
              {item.customMessage ? <Text style={styles.notes}>{item.customMessage}</Text> : null}
              <Text style={styles.docsSubhead}>Best next evidence to send</Text>
              {item.items?.filter((doc: any) => !doc.fulfilled).length > 0 ? (
                item.items.filter((doc: any) => !doc.fulfilled).map((doc: any) => (
                  <View key={doc.key} style={styles.uploadActionGroup}>
                    <View style={styles.guidanceCard}>
                      <View
                        style={[
                          styles.guidanceSemanticRow,
                          buildUploadSemanticTintStyle(
                            isDocumentScan(doc.key) ? doc.key : 'injury_photos',
                            isDocumentScan(doc.key)
                          ),
                        ]}
                      >
                        <Ionicons
                          name={buildUploadSourceSemantic(doc.key, isDocumentScan(doc.key) ? 'camera' : 'photo').icon}
                          size={14}
                          color={buildUploadSemanticIconColor(
                            isDocumentScan(doc.key) ? doc.key : 'injury_photos',
                            isDocumentScan(doc.key)
                          )}
                        />
                        <Text
                          style={[
                            styles.guidanceSemanticText,
                            {
                              color: buildUploadSemanticTextColor(
                                isDocumentScan(doc.key) ? doc.key : 'injury_photos',
                                isDocumentScan(doc.key)
                              ),
                            },
                          ]}
                        >
                          {buildRequestCaptureExpectationText(doc.key)}
                        </Text>
                      </View>
                      <View style={styles.guidanceProgressRow}>
                        <Ionicons name="arrow-forward-circle-outline" size={14} color={colors.primary} />
                        <Text style={styles.guidanceProgressText}>{getDocumentProgressGuidance(doc.key)}</Text>
                      </View>
                      <Text style={styles.guidanceUrgencyLabel}>Needed now for</Text>
                      <Text style={styles.guidanceUrgencyCopy}>{getDocumentUrgencyGuidance(doc.key)}</Text>
                      <Text style={styles.guidancePurposeLabel}>Why this helps</Text>
                      <Text style={styles.guidancePurposeCopy}>{getDocumentPurposeGuidance(doc.key)}</Text>
                      <Text style={styles.guidanceTitle}>{getCaptureGuidance(doc.key).title}</Text>
                      {getCaptureGuidance(doc.key).tips.map((tip) => (
                        <Text key={tip} style={styles.guidanceTip}>• {tip}</Text>
                      ))}
                    </View>
                    {(() => {
                      const cameraSemantic = buildUploadSourceSemantic(doc.key, 'camera')
                      const photoSemantic = buildUploadSourceSemantic(doc.key, 'photo')
                      const fileSemantic = buildUploadSourceSemantic(doc.key, 'file')

                      return (
                        <>
                    <TouchableOpacity
                      style={[
                        styles.uploadTaskButton,
                        buildUploadSemanticTintStyle(cameraSemantic.label, cameraSemantic.isSet),
                        uploadingAction === `${doc.key}:camera` && styles.uploadTaskButtonDisabled,
                      ]}
                      onPress={() => { void captureAndUpload(doc.key) }}
                      disabled={uploadingAction !== null}
                    >
                      <View style={styles.uploadTaskButtonMain}>
                        {uploadingAction === `${doc.key}:camera` ? (
                          <ActivityIndicator size="small" color={buildUploadSemanticIconColor(cameraSemantic.label, cameraSemantic.isSet)} />
                        ) : (
                          <Ionicons
                            name={cameraSemantic.icon}
                            size={18}
                            color={buildUploadSemanticIconColor(cameraSemantic.label, cameraSemantic.isSet)}
                          />
                        )}
                        <Text
                          style={[
                            styles.uploadTaskButtonText,
                            { color: buildUploadSemanticTextColor(cameraSemantic.label, cameraSemantic.isSet) },
                          ]}
                        >
                          {doc.key === 'injury_photos' ? 'Take photo' : 'Take photo / scan'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.uploadTaskIntentPill,
                          buildUploadSemanticTintStyle(cameraSemantic.label, cameraSemantic.isSet),
                        ]}
                      >
                        <Text
                          style={[
                            styles.uploadTaskIntentText,
                            { color: buildUploadSemanticTextColor(cameraSemantic.label, cameraSemantic.isSet) },
                          ]}
                        >
                          {cameraSemantic.intent}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    {supportsPhotoLibrary(doc.key) ? (
                      <TouchableOpacity
                        style={[
                          styles.uploadTaskButton,
                          buildUploadSemanticTintStyle(photoSemantic.label, photoSemantic.isSet),
                          uploadingAction === `${doc.key}:photo` && styles.uploadTaskButtonDisabled,
                        ]}
                        onPress={() => { void pickPhotoAndUpload(doc.key) }}
                        disabled={uploadingAction !== null}
                      >
                        <View style={styles.uploadTaskButtonMain}>
                          {uploadingAction === `${doc.key}:photo` ? (
                            <ActivityIndicator size="small" color={buildUploadSemanticIconColor(photoSemantic.label, photoSemantic.isSet)} />
                          ) : (
                            <Ionicons
                              name={photoSemantic.icon}
                              size={18}
                              color={buildUploadSemanticIconColor(photoSemantic.label, photoSemantic.isSet)}
                            />
                          )}
                          <Text
                            style={[
                              styles.uploadTaskButtonText,
                              { color: buildUploadSemanticTextColor(photoSemantic.label, photoSemantic.isSet) },
                            ]}
                          >
                            Choose photo
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.uploadTaskIntentPill,
                            buildUploadSemanticTintStyle(photoSemantic.label, photoSemantic.isSet),
                          ]}
                        >
                          <Text
                            style={[
                              styles.uploadTaskIntentText,
                              { color: buildUploadSemanticTextColor(photoSemantic.label, photoSemantic.isSet) },
                            ]}
                          >
                            {photoSemantic.intent}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={[
                        styles.uploadTaskButton,
                        buildUploadSemanticTintStyle(fileSemantic.label, fileSemantic.isSet),
                        uploadingAction === `${doc.key}:file` && styles.uploadTaskButtonDisabled,
                      ]}
                      onPress={() => { void pickAndUpload(doc.key) }}
                      disabled={uploadingAction !== null}
                    >
                      <View style={styles.uploadTaskButtonMain}>
                        {uploadingAction === `${doc.key}:file` ? (
                          <ActivityIndicator size="small" color={buildUploadSemanticIconColor(fileSemantic.label, fileSemantic.isSet)} />
                        ) : (
                          <Ionicons
                            name={fileSemantic.icon}
                            size={18}
                            color={buildUploadSemanticIconColor(fileSemantic.label, fileSemantic.isSet)}
                          />
                        )}
                        <Text
                          style={[
                            styles.uploadTaskButtonText,
                            { color: buildUploadSemanticTextColor(fileSemantic.label, fileSemantic.isSet) },
                          ]}
                        >
                          Choose file
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.uploadTaskIntentPill,
                          buildUploadSemanticTintStyle(fileSemantic.label, fileSemantic.isSet),
                        ]}
                      >
                        <Text
                          style={[
                            styles.uploadTaskIntentText,
                            { color: buildUploadSemanticTextColor(fileSemantic.label, fileSemantic.isSet) },
                          ]}
                        >
                          {fileSemantic.intent}
                        </Text>
                      </View>
                    </TouchableOpacity>
                        </>
                      )
                    })()}
                  </View>
                ))
              ) : (
                <Text style={styles.detail}>You have already sent everything requested here. Your attorney can keep reviewing this part of the file.</Text>
              )}
              {item.uploadLink ? (
                <TouchableOpacity style={styles.linkRow} onPress={() => { void Linking.openURL(item.uploadLink) }}>
                  <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
                  <Text style={styles.linkText}>Open upload link</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View>
              {highlightedFileIds.includes(item.id) && (index === 0 || !highlightedFileIds.includes(section.data[index - 1]?.id)) ? (
                <View style={styles.justAddedDivider}>
                  <View style={styles.justAddedDividerLine} />
                  <TouchableOpacity
                    style={[
                      styles.justAddedDividerPill,
                      buildUploadSemanticTintStyle(highlightedClusterLabel, highlightedClusterIsSet),
                    ]}
                    onPress={toggleJustAddedCluster}
                    activeOpacity={0.8}
                  >
                    <View>
                      <Text style={styles.justAddedDividerText}>
                        {`Just added (${countContiguousHighlightedFiles(section.data, index, highlightedFileIds)})`}
                      </Text>
                      <View style={styles.justAddedDividerMetaRow}>
                        <Ionicons
                          name={buildHighlightedClusterSummaryIcon(highlightedClusterLabel, highlightedClusterIsSet)}
                          size={12}
                          color={buildUploadSemanticIconColor(highlightedClusterLabel, highlightedClusterIsSet)}
                        />
                        <Text
                          style={[
                            styles.justAddedDividerMeta,
                            { color: buildUploadSemanticTextColor(highlightedClusterLabel, highlightedClusterIsSet) },
                          ]}
                        >
                          {buildHighlightedClusterSummaryWithContext(
                            section.data,
                            index,
                            highlightedFileIds,
                            highlightedClusterLabel,
                            highlightedClusterIsSet
                          )}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name={justAddedExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                      size={14}
                      color={colors.success}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.justAddedClearButton} onPress={clearJustAddedCluster} activeOpacity={0.8}>
                    <Text style={styles.justAddedClearText}>Clear</Text>
                  </TouchableOpacity>
                  <View style={styles.justAddedDividerLine} />
                </View>
              ) : null}
              {highlightedFileIds.includes(item.id) && !justAddedExpanded ? null : (
              <View
                style={[
                  styles.card,
                  highlightedFileIds.includes(item.id) && styles.cardHighlighted,
                ]}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.plaintiff}>{item.originalName || 'Uploaded document'}</Text>
                  {highlightedFileIds.includes(item.id) ? (
                    <View style={styles.newUploadPill}>
                      <Text style={styles.newUploadPillText}>New</Text>
                    </View>
                  ) : null}
                </View>
                {highlightedFileIds.includes(item.id) && highlightedClusterLabel ? (
                  <View
                    style={[
                      styles.highlightedCardSublabelRow,
                      buildUploadSemanticTintStyle(highlightedClusterLabel, highlightedClusterIsSet),
                    ]}
                  >
                    <Ionicons
                      name={buildHighlightedCardSublabelIcon(highlightedClusterLabel, highlightedClusterIsSet)}
                      size={13}
                      color={buildUploadSemanticIconColor(highlightedClusterLabel, highlightedClusterIsSet)}
                    />
                    <Text
                      style={[
                        styles.highlightedCardSublabel,
                        { color: buildUploadSemanticTextColor(highlightedClusterLabel, highlightedClusterIsSet) },
                      ]}
                    >
                      {buildHighlightedCardSublabel(highlightedClusterLabel, highlightedClusterIsSet)}
                    </Text>
                  </View>
                ) : null}
                {item.createdAt ? <Text style={styles.meta}>Added {new Date(item.createdAt).toLocaleDateString()}</Text> : null}
              </View>
              )}
            </View>
          )
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={44} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>You are all caught up</Text>
            <Text style={styles.emptySub}>
              There is nothing new to send right now. If your attorney needs more records, bills, photos, or reports, the next request will appear here.
            </Text>
          </View>
        }
      />

      <Modal visible={!!pendingImageUpload} transparent animationType="fade" onRequestClose={() => setPendingImageUpload(null)}>
        <View style={styles.previewOverlay}>
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>
              {pendingImageUpload?.replacePage ? `Review ${pendingImageUpload.replacePage.label.toLowerCase()}` : 'Review before upload'}
            </Text>
            {pendingImageUpload ? (
              <View
                style={[
                  styles.previewContextChip,
                  buildUploadSemanticTintStyle(
                    pendingImageUpload.docKey,
                    isDocumentScan(pendingImageUpload.docKey)
                  ),
                ]}
              >
                <Ionicons
                  name={buildReceiptIcon(
                    pendingImageUpload.docKey,
                    isDocumentScan(pendingImageUpload.docKey)
                  )}
                  size={14}
                  color={buildUploadSemanticIconColor(
                    pendingImageUpload.docKey,
                    isDocumentScan(pendingImageUpload.docKey)
                  )}
                />
                <Text
                  style={[
                    styles.previewContextText,
                    {
                      color: buildUploadSemanticTextColor(
                        pendingImageUpload.docKey,
                        isDocumentScan(pendingImageUpload.docKey)
                      ),
                    },
                  ]}
                >
                  {buildPreviewContextText(pendingImageUpload.docKey, !!pendingImageUpload.replacePage)}
                </Text>
              </View>
            ) : null}
            <Text style={styles.previewCopy}>
              {pendingImageUpload
                ? pendingImageUpload.replacePage
                  ? `Check this image before replacing ${pendingImageUpload.replacePage.label.toLowerCase()} in your case file.`
                  : `Check your ${plaintiffUploadLabel(pendingImageUpload.docKey).toLowerCase()} before sending it to your case file.`
                : 'Review this image before sending it to your case file.'}
            </Text>
            {pendingImageUpload ? (
              <Image source={{ uri: pendingImageUpload.asset.uri }} style={styles.previewImage} resizeMode="contain" />
            ) : null}
            <Text style={styles.previewHint}>
              {pendingImageUpload
                ? getPreviewHint(pendingImageUpload.docKey)
                : 'You can crop or adjust framing in the picker before this preview appears.'}
            </Text>
            {pendingImageUpload && isDocumentScan(pendingImageUpload.docKey) ? (
              <View style={styles.previewGuidanceBox}>
                <Text style={styles.previewGuidanceTitle}>Scanning multi-page records</Text>
                <Text style={styles.previewGuidanceText}>Upload this page first, then repeat for the next page or section until the full record set is attached.</Text>
              </View>
            ) : null}
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.previewSecondaryButton}
                onPress={() => setPendingImageUpload(null)}
                disabled={uploadingAction !== null}
              >
                <Text style={styles.previewSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.previewPrimaryButton, uploadingAction?.endsWith(':confirm') && styles.uploadTaskButtonDisabled]}
                onPress={() => { void finalizeImageUpload() }}
                disabled={uploadingAction !== null}
              >
                {uploadingAction?.endsWith(':confirm') ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.previewPrimaryText}>
                    {pendingImageUpload?.replacePage ? 'Replace page' : 'Use this image'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showFinishSetConfirm} transparent animationType="fade" onRequestClose={() => setShowFinishSetConfirm(false)}>
        <View style={styles.previewOverlay}>
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Done scanning?</Text>
            <Text style={styles.previewCopy}>
              {documentSetSession
                ? `You are about to save ${documentSetSession.pagesUploaded} page${documentSetSession.pagesUploaded === 1 ? '' : 's'} in this ${plaintiffUploadLabel(documentSetSession.docKey).toLowerCase()} set.`
                : 'Review this document set before saving it.'}
            </Text>
            {documentSetSession ? (
              <View style={styles.finishSetSummaryCard}>
                <Text style={styles.finishSetSummaryTitle}>Page order</Text>
                <Text style={styles.finishSetSummaryCopy}>Make sure everything is present and in the right order before you finish this set.</Text>
                <View style={styles.finishSetSummaryRow}>
                  {documentSetSession.pages.map((page, index) => (
                    <View key={page.id} style={styles.finishSetSummaryPill}>
                      <Ionicons
                        name={page.isImage ? 'image-outline' : 'document-text-outline'}
                        size={14}
                        color={colors.primaryDark}
                      />
                      <Text style={styles.finishSetSummaryPillText}>p{index + 1}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.previewSecondaryButton}
                onPress={() => setShowFinishSetConfirm(false)}
                disabled={uploadingAction !== null}
              >
                <Text style={styles.previewSecondaryText}>Keep scanning</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewPrimaryButton}
                onPress={finishDocumentSet}
                disabled={uploadingAction !== null}
              >
                <Text style={styles.previewPrimaryText}>Save this set</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

function MeetingRow({ event }: { event: AttorneyCalendarEvent }) {
  const claim = event.claimType ? formatClaimType(event.claimType) : 'Case'
  const canOpenLead = !!event.leadId

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.timeText}>{formatTime(event.scheduledAt)}</Text>
        <View style={styles.typePill}>
          <Text style={styles.typePillText}>{formatMeetingType(event.type)}</Text>
        </View>
      </View>
      <Text style={styles.plaintiff}>{event.plaintiffName || 'Plaintiff'}</Text>
      <Text style={styles.meta}>{claim}</Text>
      {event.status && event.status !== 'SCHEDULED' ? (
        <Text style={styles.statusLine}>Status: {event.status.replace(/_/g, ' ').toLowerCase()}</Text>
      ) : null}
      {event.location ? <Text style={styles.detail}>📍 {event.location}</Text> : null}
      {event.phoneNumber ? <Text style={styles.detail}>📞 {event.phoneNumber}</Text> : null}
      {event.meetingUrl ? (
        <TouchableOpacity
          onPress={() => Linking.openURL(event.meetingUrl!.startsWith('http') ? event.meetingUrl! : `https://${event.meetingUrl}`)}
          style={styles.linkRow}
        >
          <Ionicons name="videocam-outline" size={18} color={colors.primary} />
          <Text style={styles.linkText}>Join meeting</Text>
        </TouchableOpacity>
      ) : null}
      {event.notes ? <Text style={styles.notes}>{event.notes}</Text> : null}
      {canOpenLead ? (
        <TouchableOpacity
          style={styles.caseLink}
          onPress={() => router.push(`/(app)/lead/${event.leadId}`)}
          activeOpacity={0.85}
        >
          <Text style={styles.caseLinkText}>Open case</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  monthTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listPad: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  emptyContainer: { flexGrow: 1, padding: space.lg },
  plaintiffHeaderWrap: { paddingHorizontal: space.lg, paddingTop: space.lg },
  plaintiffDocsHero: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: space.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  documentSetCard: {
    marginTop: space.md,
    backgroundColor: colors.primary + '10',
    borderRadius: radii.xl,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.primary + '22',
  },
  documentSetTitle: { fontSize: 16, fontWeight: '800', color: colors.primaryDark },
  documentSetContextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  documentSetContextText: {
    fontSize: 12,
    fontWeight: '700',
  },
  documentSetCopy: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginTop: 6 },
  documentSetPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.md,
  },
  documentSetPreviewItem: {
    alignItems: 'center',
    gap: 6,
  },
  documentSetPageActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  documentSetThumbWrap: {
    alignItems: 'center',
    gap: 4,
  },
  documentSetThumb: {
    width: 54,
    height: 54,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  documentSetThumbLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  documentSetFilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  documentSetFileText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  documentSetPageReplaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary + '33',
    backgroundColor: colors.card,
  },
  documentSetPageReplaceText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  documentSetPageRemoveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.danger + '33',
    backgroundColor: colors.card,
  },
  documentSetPageRemoveText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.danger,
  },
  documentSetActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.md,
  },
  documentSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary + '44',
    backgroundColor: colors.card,
  },
  documentSetButtonText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  documentSetDoneButton: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  documentSetDoneText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  sectionHeader: {
    backgroundColor: colors.surface,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  notice: {
    marginBottom: space.md,
    padding: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  noticeSuccess: {
    backgroundColor: colors.successMuted,
    borderColor: colors.success,
  },
  noticeError: {
    backgroundColor: colors.dangerMuted,
    borderColor: colors.danger,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  undoNotice: {
    marginBottom: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary + '22',
    backgroundColor: colors.primary + '10',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  undoNoticeRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  undoNoticeText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  undoNoticeAction: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  receiptCard: {
    marginBottom: space.md,
    padding: space.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.success + '33',
    backgroundColor: colors.successMuted,
    ...shadows.soft,
  },
  receiptTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptContextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  receiptContextText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  receiptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.success + '22',
  },
  receiptBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: space.md,
  },
  receiptCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: 6,
  },
  receiptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.md,
  },
  receiptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  receiptPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  receiptAction: {
    marginTop: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  receiptActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  caseStageCard: {
    marginBottom: space.md,
    padding: space.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    ...shadows.soft,
  },
  caseStageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  caseStageChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  caseStageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: space.md,
  },
  caseStageCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: 6,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 4,
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
  cardHighlighted: {
    borderColor: colors.success,
    backgroundColor: colors.successMuted,
  },
  justAddedDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.sm,
    marginBottom: space.sm,
  },
  justAddedDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.success + '33',
  },
  justAddedDividerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.successMuted,
    borderWidth: 1,
    borderColor: colors.success + '33',
  },
  justAddedClearButton: {
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  justAddedClearText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  justAddedDividerText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  justAddedDividerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  justAddedDividerMeta: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm },
  newUploadPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.success + '33',
  },
  newUploadPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  timeText: { fontSize: 20, fontWeight: '800', color: colors.text },
  typePill: {
    backgroundColor: colors.primary + '18',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  typePillText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  plaintiff: { fontSize: 17, fontWeight: '700', color: colors.text },
  highlightedCardSublabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: -2,
    marginBottom: 4,
  },
  highlightedCardSublabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  meta: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  docsSubhead: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: space.md, textTransform: 'uppercase', letterSpacing: 0.4 },
  statusLine: { fontSize: 12, color: colors.warning, marginTop: 6, fontWeight: '600' },
  detail: { fontSize: 14, color: colors.text, marginTop: 6 },
  notes: { fontSize: 14, color: colors.textSecondary, marginTop: 8, lineHeight: 20 },
  uploadTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary + '44',
    backgroundColor: colors.primary + '10',
  },
  uploadTaskButtonMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flexShrink: 1,
  },
  uploadTaskButtonDisabled: {
    opacity: 0.7,
  },
  uploadActionGroup: {
    marginTop: space.sm,
  },
  guidanceCard: {
    marginTop: space.sm,
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guidanceSemanticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: space.sm,
  },
  guidanceSemanticText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  guidanceProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: space.sm,
  },
  guidanceProgressText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.primaryDark,
    fontWeight: '600',
    flexShrink: 1,
  },
  guidanceUrgencyLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colors.warning,
  },
  guidanceUrgencyCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
    marginTop: 4,
    marginBottom: space.sm,
  },
  guidancePurposeLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  guidancePurposeCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
    marginTop: 4,
    marginBottom: space.sm,
  },
  guidanceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  guidanceTip: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: 6,
  },
  uploadTaskButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    flexShrink: 1,
  },
  uploadTaskIntentPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginLeft: space.sm,
  },
  uploadTaskIntentText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  linkText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  caseLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  caseLinkText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: space.md },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 21 },
  previewOverlay: {
    flex: 1,
    backgroundColor: '#00000088',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  previewCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: space.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  previewTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  previewContextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  previewContextText: {
    fontSize: 12,
    fontWeight: '700',
  },
  previewCopy: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginTop: space.sm },
  previewImage: {
    width: '100%',
    height: 280,
    borderRadius: radii.lg,
    marginTop: space.lg,
    backgroundColor: colors.surface,
  },
  previewHint: { fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: space.md },
  previewGuidanceBox: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '22',
  },
  previewGuidanceTitle: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  previewGuidanceText: { fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginTop: 6 },
  finishSetSummaryCard: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  finishSetSummaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  finishSetSummaryCopy: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  finishSetSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  finishSetSummaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  finishSetSummaryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  previewActions: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.lg,
  },
  previewSecondaryButton: {
    flex: 1,
    paddingVertical: space.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewSecondaryText: { fontSize: 15, fontWeight: '700', color: colors.text },
  previewPrimaryButton: {
    flex: 1,
    paddingVertical: space.md,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPrimaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
})
