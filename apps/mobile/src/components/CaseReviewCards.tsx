/**
 * Case review cards matching the web pre-acceptance tabs: the AI scene
 * diagram, the medical picture, and insurance coverage. All three read the
 * same lead payload the web uses, so the two apps describe a case the same way.
 */
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getAuthHeaders, getLeadDetails, regenerateLeadSceneImage, toAbsoluteApiUrl } from '../lib/api'
import { colors, radii, shadows, space } from '../theme/tokens'

const SCENE_NEEDS_DESCRIPTION = 'needs_description'
const SCENE_UNAVAILABLE = 'unavailable'

const DEFAULT_MEDICAL_PENDING_MESSAGE =
  'Medical records and extracted treatment details are pending plaintiff account creation and HIPAA authorization. The visible case summary is based on intake answers only until the plaintiff authorizes medical document sharing.'

function money(value: number) {
  return `$${Math.round(value).toLocaleString('en-US')}`
}

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

export function SceneDiagramCard({
  leadId,
  sceneImageUrl,
  sceneImageStatus,
}: {
  leadId: string
  sceneImageUrl: string | null
  sceneImageStatus: string | null
}) {
  const [status, setStatus] = useState(sceneImageStatus || (sceneImageUrl ? 'ready' : 'pending'))
  const [url, setUrl] = useState<string | null>(sceneImageUrl)
  const [headers, setHeaders] = useState<Record<string, string> | null>(null)
  const [imageFailed, setImageFailed] = useState(false)
  const pollsRef = useRef(0)

  useEffect(() => {
    void getAuthHeaders().then(setHeaders)
  }, [])

  // Poll while the diagram is still being drawn, for up to about two minutes.
  useEffect(() => {
    if (status !== 'pending' || url) return
    pollsRef.current = 0
    const timer = setInterval(async () => {
      pollsRef.current += 1
      try {
        const lead = await getLeadDetails(leadId)
        const nextUrl = lead?.assessment?.sceneImageUrl || null
        const nextStatus = lead?.assessment?.sceneImageStatus || null
        if (nextUrl) {
          setUrl(nextUrl)
          setStatus('ready')
        } else if (nextStatus === 'failed' || nextStatus === SCENE_NEEDS_DESCRIPTION || nextStatus === SCENE_UNAVAILABLE) {
          setStatus(nextStatus)
        }
      } catch {
        /* keep polling */
      }
      if (pollsRef.current >= 30) clearInterval(timer)
    }, 4000)
    return () => clearInterval(timer)
  }, [leadId, status, url])

  async function regenerate() {
    setStatus('pending')
    setUrl(null)
    setImageFailed(false)
    try {
      const res = await regenerateLeadSceneImage(leadId)
      if (res?.status === SCENE_NEEDS_DESCRIPTION) setStatus(SCENE_NEEDS_DESCRIPTION)
    } catch {
      setStatus('failed')
    }
  }

  const showImage = Boolean(url && headers) && status !== 'pending' && !imageFailed
  const canRetry = status !== SCENE_NEEDS_DESCRIPTION && status !== 'pending'
  const message =
    status === SCENE_NEEDS_DESCRIPTION
      ? {
          icon: 'document-text-outline' as const,
          title: 'No diagram for this case',
          body: 'The claimant didn’t describe how the incident happened, so there’s nothing to reconstruct.',
        }
      : status === SCENE_UNAVAILABLE
        ? {
            icon: 'cloud-offline-outline' as const,
            title: 'Diagram service is unavailable right now',
            body: 'This isn’t a problem with the case. Try again later.',
          }
        : status === 'failed' || imageFailed
          ? {
              icon: 'image-outline' as const,
              title: 'The diagram didn’t generate',
              body: 'The image service didn’t return a picture this time.',
            }
          : null

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Incident reconstruction</Text>
        {canRetry && (
          <TouchableOpacity onPress={() => void regenerate()} hitSlop={8}>
            <Text style={styles.link}>{showImage ? 'Regenerate' : 'Try again'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {showImage ? (
        <>
          <Image
            source={{ uri: toAbsoluteApiUrl(url!), headers: headers! }}
            style={styles.sceneImage}
            resizeMode="contain"
            accessibilityLabel="AI-generated schematic reconstruction of the incident"
            onError={() => setImageFailed(true)}
          />
          <Text style={styles.disclaimer}>
            For context only — not evidence. This AI schematic is drawn from the intake description and may omit or
            misstate details.
          </Text>
        </>
      ) : message ? (
        <View style={styles.stateRow}>
          <Ionicons name={message.icon} size={20} color={colors.muted} />
          <View style={styles.stateBody}>
            <Text style={styles.stateTitle}>{message.title}</Text>
            <Text style={styles.stateText}>{message.body}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.stateRow}>
          <ActivityIndicator color={colors.primary} />
          <View style={styles.stateBody}>
            <Text style={styles.stateTitle}>Drawing a diagram of the incident…</Text>
            <Text style={styles.stateText}>This usually takes a few seconds.</Text>
          </View>
        </View>
      )}
    </View>
  )
}

export function MedicalReviewCard({
  facts,
  medicalSharing,
  hasMedicalFiles,
}: {
  facts: any
  medicalSharing?: { canShareMedicalData?: boolean; message?: string } | null
  hasMedicalFiles: boolean
}) {
  const pending = medicalSharing?.canShareMedicalData === false
  const treatments: any[] = Array.isArray(facts?.treatment) ? facts.treatment : []
  const sorted = [...treatments].sort((a, b) => {
    const at = a?.date ? new Date(a.date).getTime() : 0
    const bt = b?.date ? new Date(b.date).getTime() : 0
    return at - bt
  })
  const providers = new Set(sorted.map((t) => String(t?.provider || t?.type || '').toLowerCase()).filter(Boolean))
  const medSpecials = Number(facts?.damages?.med_charges) || 0
  const continuity = treatments.length === 0 ? 'Not assessed yet' : treatments.length >= 2 ? 'Good' : 'Fragmented'
  const dateLabel = (d?: string) => (d ? new Date(d).toLocaleDateString() : null)
  const firstVisit = dateLabel(sorted[0]?.date) || '—'
  const lastVisit = dateLabel(sorted[sorted.length - 1]?.date) || '—'

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Medical</Text>
      {pending ? (
        <View style={[styles.notice, styles.noticeWarning]}>
          <Text style={styles.noticeTitle}>Medical records pending authorization</Text>
          <Text style={styles.noticeText}>{medicalSharing?.message || DEFAULT_MEDICAL_PENDING_MESSAGE}</Text>
        </View>
      ) : treatments.length === 0 && !hasMedicalFiles ? (
        <Text style={styles.stateText}>No medical treatment data yet.</Text>
      ) : (
        <>
          <Row label="Treatment continuity" value={continuity} />
          <Row label="Providers" value={providers.size ? String(providers.size) : '—'} />
          <Row label="Medical specials" value={medSpecials ? money(medSpecials) : '—'} />
          <Row label="Treatment window" value={sorted.length ? `${firstVisit} → ${lastVisit}` : '—'} />
          {sorted.length > 0 && (
            <View style={styles.timeline}>
              {sorted.map((t, i) => (
                <View key={i} style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.stateBody}>
                    <Text style={styles.timelineTitle}>
                      {[dateLabel(t?.date), titleCase(String(t?.provider || t?.type || 'Treatment visit'))]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                    {t?.diagnosis ? <Text style={styles.timelineText}>Dx: {t.diagnosis}</Text> : null}
                    {t?.treatment ? <Text style={styles.timelineText}>Tx: {t.treatment}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  )
}

export function InsuranceReviewCard({ facts }: { facts: any }) {
  const ins = (facts?.insurance || {}) as Record<string, any>
  const hasInfo = Object.keys(ins).length > 0
  const noCoverage = ins.hasInsurance === false || ins.otherPartyInsured === 'no'
  const carrier = ins.carrier || ins.company || ins.provider || ins.insurerName
  const coverageType = ins.coverage_type || ins.policyType || ins.type
  const policyLimit = Number(ins.policy_limit) || 0
  const medSpecials = Number(facts?.damages?.med_charges) || 0

  const carrierLabel = !hasInfo
    ? 'Not provided yet'
    : noCoverage
      ? 'No coverage reported'
      : carrier
        ? String(carrier)
        : 'Details on file'

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Insurance</Text>
      <Row label="Carrier" value={carrierLabel} />
      <Row label="Policy limit" value={policyLimit ? money(policyLimit) : '—'} />
      <Row
        label="Coverage"
        value={noCoverage ? 'No coverage reported' : coverageType ? titleCase(String(coverageType)) : hasInfo ? 'On file' : '—'}
      />
      {policyLimit && medSpecials > policyLimit ? (
        <View style={[styles.notice, styles.noticeWarning]}>
          <Text style={styles.noticeText}>
            Medical specials ({money(medSpecials)}) already exceed the reported policy limit ({money(policyLimit)}).
            Check for excess/UM coverage or additional defendants.
          </Text>
        </View>
      ) : policyLimit && medSpecials ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Medical specials to date are {money(medSpecials)} against a {money(policyLimit)} policy limit.
          </Text>
        </View>
      ) : (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Confirm coverage limits and layers (UM/UIM, umbrella) during intake to validate the value range.
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: space.sm },
  link: { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: space.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  rowValue: { flex: 1, textAlign: 'right', fontSize: 14, fontWeight: '600', color: colors.text },
  sceneImage: { width: '100%', aspectRatio: 1.5, borderRadius: radii.md, backgroundColor: '#ffffff' },
  disclaimer: {
    marginTop: space.sm,
    fontSize: 12,
    lineHeight: 17,
    color: colors.warning,
  },
  stateRow: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  stateBody: { flex: 1 },
  stateTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  stateText: { marginTop: 2, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  notice: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noticeWarning: { backgroundColor: colors.warningMuted, borderColor: colors.warning + '77' },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  noticeText: { fontSize: 13, lineHeight: 18, color: colors.text },
  timeline: { marginTop: space.md, borderLeftWidth: 2, borderLeftColor: colors.border, paddingLeft: space.md, gap: space.md },
  timelineItem: { flexDirection: 'row', gap: space.sm },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 4, marginLeft: -(space.md + 6) },
  timelineTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  timelineText: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
})
