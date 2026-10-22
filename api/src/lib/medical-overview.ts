/**
 * The attorney Medical tab's header: what the records show next to what the
 * attorney has confirmed, and what is left to resolve before the medical
 * section of a demand can rest on it.
 *
 * "Found" comes from extraction (document findings and the evidence-derived
 * chronology) and is never authoritative. "Confirmed" is only what an attorney
 * entered or accepted: medical timeline entries and medical ledger lines. The
 * two used to sit on one page under the same labels ($6,280 billed beside $0
 * specials, 5 events beside 0 visits) with nothing saying which was which.
 */
import { prisma } from './prisma'
import { buildMedicalChronologySummary } from './case-insights'
import { listDocumentFindings } from './document-findings'
import { getMedicalTimeline } from './medical-record'
import { detectSyntheticMarkers } from './medical-text-hygiene'

export type TestDocument = { fileId: string; fileName: string; category: string; markers: string[] }

export type MedicalGap = {
  key: string
  label: string
  severity: 'high' | 'medium' | 'low'
  /** The Medical sub-tab where it is resolved. */
  tab: 'overview' | 'treatment' | 'bills' | 'evidence' | 'impact'
}

export type ReadinessState = 'ready' | 'needs_review' | 'missing'

export interface MedicalOverview {
  visits: { found: number; pending: number; confirmed: number }
  charges: { found: number; pendingCount: number; confirmed: number }
  providers: { found: string[]; confirmed: string[]; unconfirmed: string[] }
  firstVisit: string | null
  lastVisit: string | null
  largestGapDays: number | null
  gaps: MedicalGap[]
  testDocuments: TestDocument[]
  readiness: {
    evidenceExtracted: ReadinessState
    treatmentReconciled: ReadinessState
    providersVerified: ReadinessState
    demandReady: ReadinessState
  }
}

/** Uploaded files labelled as synthetic, sample or test material. */
export async function findTestDocuments(assessmentId: string): Promise<TestDocument[]> {
  const files = await prisma.evidenceFile.findMany({
    where: { assessmentId },
    select: { id: true, originalName: true, category: true, ocrText: true },
  })
  return files
    .map((f) => ({
      fileId: f.id,
      fileName: f.originalName || 'Document',
      category: f.category,
      markers: detectSyntheticMarkers(f.ocrText),
    }))
    .filter((f) => f.markers.length > 0)
}

function sameProvider(a: string, b: string) {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const x = norm(a)
  const y = norm(b)
  return Boolean(x && y) && (x.includes(y) || y.includes(x))
}

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)
}

export async function buildMedicalOverview(assessmentId: string, opts: { canShareMedical?: boolean } = {}): Promise<MedicalOverview> {
  const [summary, timeline, findings, testDocuments, medicalItems, medicalFileCount] = await Promise.all([
    buildMedicalChronologySummary(assessmentId),
    getMedicalTimeline(assessmentId),
    opts.canShareMedical === false
      ? Promise.resolve([])
      : listDocumentFindings(assessmentId, { kinds: ['treatment_visit', 'medical_charge'] }),
    findTestDocuments(assessmentId),
    prisma.damageItem.findMany({
      where: { assessmentId, category: 'medical', isFuture: false },
      select: { amount: true },
    }),
    prisma.evidenceFile.count({ where: { assessmentId, category: { in: ['medical_records', 'bills'] } } }),
  ])

  const visitFindings = findings.filter((f) => f.kind === 'treatment_visit' && f.status !== 'rejected')
  const chargeFindings = findings.filter((f) => f.kind === 'medical_charge')
  const pendingVisits = visitFindings.filter((f) => f.status === 'proposed').length
  const pendingCharges = chargeFindings.filter((f) => f.status === 'proposed')
  const datedRecordEvents = summary.timeline.filter((e) => e.source === 'medical_record' && e.date).length

  const confirmedEntries = timeline.entries.filter((e) => !e.isFuture)
  const confirmedProviders = [...new Set(confirmedEntries.map((e) => e.provider).filter(Boolean))]
  const foundProviders = [
    ...new Set([...summary.providers, ...visitFindings.map((f) => f.data.provider || '').filter(Boolean)]),
  ]
  const unconfirmedProviders = foundProviders.filter((p) => !confirmedProviders.some((c) => sameProvider(p, c)))

  const confirmedCharges = Math.round(medicalItems.reduce((s, i) => s + (Number(i.amount) || 0), 0) * 100) / 100
  const visitsFound = Math.max(visitFindings.length, datedRecordEvents)

  const dates = (confirmedEntries.length
    ? confirmedEntries.map((e) => e.startDate?.slice(0, 10))
    : summary.timeline.filter((e) => e.source === 'medical_record').map((e) => e.date?.slice(0, 10))
  )
    .filter((d): d is string => Boolean(d))
    .sort()
  let largestGapDays: number | null = null
  for (let i = 1; i < dates.length; i++) {
    const gap = daysBetween(dates[i - 1], dates[i])
    if (largestGapDays === null || gap > largestGapDays) largestGapDays = gap
  }

  const gaps: MedicalGap[] = []
  if (testDocuments.length) {
    gaps.push({
      key: 'test_documents',
      label: `${testDocuments.length} document${testDocuments.length === 1 ? ' is' : 's are'} labelled synthetic or test material and can't support a demand`,
      severity: 'high',
      tab: 'evidence',
    })
  }
  if (pendingVisits) {
    gaps.push({ key: 'pending_visits', label: `${pendingVisits} visit${pendingVisits === 1 ? '' : 's'} found in the records to review`, severity: 'high', tab: 'evidence' })
  }
  if (pendingCharges.length) {
    gaps.push({ key: 'pending_charges', label: `${pendingCharges.length} charge${pendingCharges.length === 1 ? '' : 's'} found on bills to review`, severity: 'high', tab: 'bills' })
  }
  if (summary.billedTotal > 0 && confirmedCharges === 0 && !pendingCharges.length) {
    gaps.push({ key: 'charges_unverified', label: `$${summary.billedTotal.toLocaleString('en-US')} read from bills is not in the damages ledger yet`, severity: 'high', tab: 'bills' })
  }
  if (visitsFound > 0 && confirmedEntries.length === 0 && !pendingVisits) {
    gaps.push({ key: 'visits_unconfirmed', label: 'Treatment found in the records has not been added to the timeline', severity: 'high', tab: 'treatment' })
  }
  if (unconfirmedProviders.length) {
    gaps.push({ key: 'providers_unverified', label: `${unconfirmedProviders.length} provider${unconfirmedProviders.length === 1 ? '' : 's'} named in the records not yet confirmed`, severity: 'medium', tab: 'evidence' })
  }
  if (confirmedEntries.length && !confirmedEntries.some((e) => e.diagnosis || e.diagnosisCodes.length)) {
    gaps.push({ key: 'no_diagnosis', label: 'No confirmed visit carries a diagnosis', severity: 'medium', tab: 'treatment' })
  }
  if (largestGapDays !== null && largestGapDays > 30) {
    gaps.push({ key: 'treatment_gap', label: `${largestGapDays}-day gap in care to explain`, severity: largestGapDays > 60 ? 'high' : 'medium', tab: 'treatment' })
  }
  if (medicalFileCount === 0) {
    gaps.push({ key: 'no_records', label: 'No medical records or bills uploaded', severity: 'high', tab: 'evidence' })
  }

  const evidenceExtracted: ReadinessState = medicalFileCount === 0 ? 'missing' : 'ready'
  const treatmentReconciled: ReadinessState =
    confirmedEntries.length === 0 ? (visitsFound ? 'needs_review' : 'missing') : pendingVisits ? 'needs_review' : 'ready'
  const providersVerified: ReadinessState =
    foundProviders.length === 0 && confirmedProviders.length === 0 ? 'missing' : unconfirmedProviders.length ? 'needs_review' : 'ready'
  const demandReady: ReadinessState =
    testDocuments.length || gaps.some((g) => g.severity === 'high')
      ? 'needs_review'
      : confirmedEntries.length && confirmedCharges > 0
        ? 'ready'
        : 'missing'

  return {
    visits: { found: visitsFound, pending: pendingVisits, confirmed: confirmedEntries.length },
    charges: { found: summary.billedTotal, pendingCount: pendingCharges.length, confirmed: confirmedCharges },
    providers: { found: foundProviders, confirmed: confirmedProviders, unconfirmed: unconfirmedProviders },
    firstVisit: dates[0] || null,
    lastVisit: dates[dates.length - 1] || null,
    largestGapDays,
    gaps,
    testDocuments,
    readiness: { evidenceExtracted, treatmentReconciled, providersVerified, demandReady },
  }
}
