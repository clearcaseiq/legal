/**
 * Case Recalculation Pipeline
 * When documents are uploaded: OCR → extraction → merge into facts → predict → notify
 */

import { prisma } from './prisma'
import { computeFeatures, predictViability } from './prediction'
import { logger } from './logger'
import { sendPlaintiffCaseValueUpdated, sendAttorneyCaseMaterialUpdate } from './case-notifications'

const MODEL_VERSION = 'v1.3'

export interface RecalculationResult {
  predictionId: string
  previousValue: { p25: number; median: number; p75: number } | null
  newValue: { p25: number; median: number; p75: number }
  plaintiffNotified: boolean
  attorneysNotified: number
  reason: string
}

/**
 * Merge evidence files' extracted data into assessment.facts for prediction
 */
interface MedBillProvenanceItem {
  kind: 'document' | 'self_reported'
  label: string
  amount: number
  fileId?: string
  uploadedAt?: string | null
}

/**
 * Whether a document-type upload (bill, medical record, police report) actually carries
 * usable content. A blank image, an unreadable scan, or a non-document photo returns false,
 * so it never inflates case strength / liability / attorney-acceptance on presence alone.
 */
function fileHasUsableContent(file: {
  ocrText?: string | null
  extractedData?: Array<{
    totalAmount?: number | null
    dollarAmounts?: string | null
    icdCodes?: string | null
    dates?: string | null
  }> | null
}): boolean {
  const ext = file.extractedData?.[0]
  if (ext) {
    if (Number(ext.totalAmount ?? 0) > 0) return true
    const nonEmpty = (v?: string | null) => !!v && String(v).replace(/[[\]\s",]/g, '').length > 0
    if (nonEmpty(ext.icdCodes) || nonEmpty(ext.dates) || nonEmpty(ext.dollarAmounts)) return true
  }
  if ((file.ocrText || '').trim().length >= 20) return true
  return false
}

function mergeEvidenceIntoFacts(
  facts: Record<string, unknown>,
  evidenceFiles: Array<{
    id?: string
    originalName?: string | null
    category: string
    aiClassification?: string | null
    aiSummary?: string | null
    aiHighlights?: string | null
    ocrText?: string | null
    createdAt?: Date | string | null
    extractedData?: Array<{
      totalAmount?: number | null
      dollarAmounts?: string | null
      icdCodes?: string | null
      dates?: string | null
    }> | null
  }>
): Record<string, unknown> {
  const merged = JSON.parse(JSON.stringify(facts)) as Record<string, unknown>
  const damages = (merged.damages as Record<string, unknown>) || {}
  const treatment = (merged.treatment as Array<unknown>) || []
  const evidence = new Set<string>((merged.evidence as string[]) || [])
  // These categories are (re)derived from the current files below, gated on usable content,
  // so clear any stale presence-based credit from a previous run before re-evaluating.
  for (const managed of ['police_report', 'medical_bills', 'medical_records', 'photos']) {
    evidence.delete(managed)
  }

  const intakeMedCharges = Number(damages.intake_med_charges ?? damages.med_charges) || 0
  const intakeMedPaid = Number(damages.intake_med_paid ?? damages.med_paid) || 0
  const billRange = String(damages.medical_bill_range || '')
  const billsComplete = damages.bills_complete === true
  let extractedMedCharges = 0
  let extractedMedPaid = 0
  let extractedWageLoss = 0
  let medBillFileCount = 0
  // Dedupe bill amounts so the same statement (or a re-upload) is not double-counted.
  const seenBillKeys = new Set<string>()
  // Per-document provenance so attorneys can verify every dollar against its source.
  const billItems: MedBillProvenanceItem[] = []
  // Photos corroborate but carry no dollar value — dedupe them and let scoring cap the contribution.
  const seenPhotoKeys = new Set<string>()
  let photoCount = 0
  // Uploads received but not yet readable/verified: never credit scores, but surface for follow-up.
  let unverifiedUploads = 0

  for (const file of evidenceFiles) {
    const cat = file.aiClassification || file.category
    const isPolice = cat === 'police_report' || file.category === 'police_report'
    const isBills = cat === 'bills' || file.category === 'bills'
    const isRecords = cat === 'medical_records' || file.category === 'medical_records'
    const isPhotos = cat === 'photos' || file.category === 'photos'

    if (isPhotos) {
      const photoKey = String(file.originalName || file.id || `photo-${photoCount}`).trim().toLowerCase()
      if (!seenPhotoKeys.has(photoKey)) {
        seenPhotoKeys.add(photoKey)
        photoCount += 1
        evidence.add('photos')
      }
    } else if (isPolice || isBills || isRecords) {
      // Document-type uploads only count toward strength once we can read usable content.
      if (fileHasUsableContent(file)) {
        if (isPolice) evidence.add('police_report')
        if (isBills) evidence.add('medical_bills')
        if (isRecords) evidence.add('medical_records')
      } else {
        unverifiedUploads += 1
      }
    }

    const ext = file.extractedData?.[0]
    if (ext) {
      const amt = ext.totalAmount ?? 0
      if (amt > 0) {
        if (isLostWageEvidence(file)) {
          extractedWageLoss += extractWageLossAmount(file.ocrText || '', amt)
        } else if (isMedicalChargeEvidence(file)) {
          const billKey = `${(file.originalName || '').trim().toLowerCase()}|${Math.round(amt)}`
          if (!seenBillKeys.has(billKey)) {
            seenBillKeys.add(billKey)
            extractedMedCharges += amt
            extractedMedPaid += amt * 0.8 // Charges are claimed; paid is tracked separately (~80% placeholder)
            medBillFileCount += 1
            billItems.push({
              kind: 'document',
              label: file.originalName || file.aiSummary || (file.category === 'bills' ? 'Medical bill' : 'Medical record'),
              amount: Math.round(amt),
              fileId: file.id,
              uploadedAt: file.createdAt ? new Date(file.createdAt).toISOString() : null,
            })
          }
        }
      }
      if (ext.icdCodes && file.category === 'medical_records') {
        try {
          const codes = typeof ext.icdCodes === 'string' ? JSON.parse(ext.icdCodes) : ext.icdCodes
          if (Array.isArray(codes) && codes.length > 0 && !treatment.some((t: any) => t?.diagnosis)) {
            treatment.push({
              provider: 'From uploaded records',
              diagnosis: codes[0],
              treatment: file.aiSummary || 'Medical record',
              date: ext.dates ? (typeof ext.dates === 'string' ? JSON.parse(ext.dates) : ext.dates)[0] : null
            })
          }
        } catch (_) {
          /* ignore */
        }
      }
    }
  }

  // --- Medical specials decision rule ---
  // Documents are the source of truth when present and complete; the self-reported
  // range is a fallback/floor. We never let a partial document upload *lower* the
  // self-reported figure, but a complete upload replaces it.
  const hasExtracted = extractedMedCharges > 0
  const isTopBucket = billRange === 'over_50000'
  let medSource: 'documented' | 'partially_documented' | 'self_reported'
  let totalMedCharges: number
  let totalMedPaid: number
  let medChargesIsFloor = false

  if (!hasExtracted) {
    medSource = 'self_reported'
    totalMedCharges = intakeMedCharges
    totalMedPaid = intakeMedPaid
    // The top "$50k+" bucket is a floor, not a ceiling — flag so the UI can prompt to refine.
    medChargesIsFloor = isTopBucket
  } else if (billsComplete) {
    medSource = 'documented'
    totalMedCharges = extractedMedCharges
    totalMedPaid = extractedMedPaid
  } else {
    medSource = 'partially_documented'
    totalMedCharges = Math.max(extractedMedCharges, intakeMedCharges)
    totalMedPaid = Math.max(extractedMedPaid, intakeMedPaid)
    medChargesIsFloor = true // more bills may exist
  }

  // --- Discrepancy flag for attorney review ---
  // Only meaningful when both a self-reported number and a documented number exist.
  let medDiscrepancy: Record<string, unknown> | null = null
  if (hasExtracted && intakeMedCharges > 0) {
    const diff = Math.abs(extractedMedCharges - intakeMedCharges)
    const ratio = diff / Math.max(extractedMedCharges, intakeMedCharges)
    if (diff >= 5000 && ratio >= 0.4) {
      medDiscrepancy = {
        intake: Math.round(intakeMedCharges),
        extracted: Math.round(extractedMedCharges),
        ratio: Number(ratio.toFixed(2)),
        direction: extractedMedCharges > intakeMedCharges ? 'documented_higher' : 'self_reported_higher',
        severity: ratio >= 0.7 ? 'high' : 'medium',
      }
    }
  }

  // --- Provenance breakdown (what makes the figure verifiable to an attorney) ---
  // Documented line items first, then the self-reported portion only when it is the
  // value actually being used (no docs, or it exceeds the documented total).
  const provenanceItems: MedBillProvenanceItem[] = [...billItems]
  const selfReportedInUse = !hasExtracted || (medSource === 'partially_documented' && intakeMedCharges > extractedMedCharges)
  if (selfReportedInUse && intakeMedCharges > 0) {
    provenanceItems.push({
      kind: 'self_reported',
      label: medChargesIsFloor && isTopBucket ? 'Self-reported ($50k+ range)' : 'Self-reported estimate',
      amount: Math.round(intakeMedCharges),
    })
  }

  const intakeWageLoss = Number(damages.wage_loss) || 0
  const totalWageLoss = Math.max(intakeWageLoss, extractedWageLoss)
  merged.damages = {
    ...damages,
    intake_med_charges: intakeMedCharges,
    intake_med_paid: intakeMedPaid,
    extracted_med_charges: extractedMedCharges,
    extracted_med_paid: extractedMedPaid,
    extracted_wage_loss: extractedWageLoss,
    med_bill_file_count: medBillFileCount,
    photo_count: photoCount,
    evidence_unverified_count: unverifiedUploads,
    med_charges: totalMedCharges,
    med_paid: totalMedPaid,
    med_charges_source: medSource,
    med_charges_is_floor: medChargesIsFloor,
    med_discrepancy: medDiscrepancy,
    med_bill_items: provenanceItems,
    wage_loss: totalWageLoss,
  }
  merged.treatment = treatment
  merged.evidence = Array.from(evidence)
  return merged
}

function evidenceText(file: {
  originalName?: string | null
  category: string
  aiClassification?: string | null
  aiSummary?: string | null
  aiHighlights?: string | null
}) {
  return `${file.category} ${file.originalName || ''} ${file.aiClassification || ''} ${file.aiSummary || ''} ${file.aiHighlights || ''}`.toLowerCase()
}

function isLostWageEvidence(file: {
  originalName?: string | null
  category: string
  aiClassification?: string | null
  aiSummary?: string | null
  aiHighlights?: string | null
}) {
  // A damages-summary rolls up wage + medical + out-of-pocket; counting it here would
  // double-count the standalone wage document, so exclude it like we do for medical charges.
  if (isDamagesSummaryEvidence(file)) return false
  return /\b(wage|wages|lost wages|payroll|pay stub|employer|income|earnings)\b/.test(evidenceText(file))
}

function isDamagesSummaryEvidence(file: {
  originalName?: string | null
  category: string
  aiClassification?: string | null
  aiSummary?: string | null
  aiHighlights?: string | null
}) {
  return /\b(damages summary|economic damages|total economic damages)\b/.test(evidenceText(file))
}

function isMedicalChargeEvidence(file: {
  originalName?: string | null
  category: string
  aiClassification?: string | null
  aiSummary?: string | null
  aiHighlights?: string | null
}) {
  const cat = file.aiClassification || file.category
  return (cat === 'bills' || file.category === 'bills' || file.category === 'medical_records') && !isDamagesSummaryEvidence(file)
}

function extractWageLossAmount(ocrText: string, fallback: number) {
  // Prefer an explicitly labeled total ("Total Lost Wages: $3,120") so we don't grab a
  // single column line item (e.g. the first weekly "$240") that follows a "Lost Wages" header.
  const totalMatch = ocrText.match(/\btotal\s+(?:wage\s+loss|lost\s+wages)\b[^$]{0,40}\$([\d,]+(?:\.\d{1,2})?)/i)
  if (totalMatch) {
    const amount = Number(totalMatch[1].replace(/,/g, ''))
    if (Number.isFinite(amount) && amount > 0) return amount
  }
  // Otherwise fall back to the document total (already labeled-total aware upstream).
  return fallback
}

/**
 * Build AI-extracted summary for display (Treatment, Diagnosis, Provider)
 */
export function buildAIExtractedSummary(file: {
  category: string
  aiClassification?: string | null
  aiSummary?: string | null
  aiHighlights?: string | null
  extractedData?: Array<{
    totalAmount?: number | null
    dollarAmounts?: string | null
    icdCodes?: string | null
    cptCodes?: string | null
    dates?: string | null
  }> | null
}): { treatment?: string; diagnosis?: string; provider?: string; amounts?: string } {
  const ext = file.extractedData?.[0]
  const result: Record<string, string> = {}
  if (ext?.icdCodes) {
    try {
      const codes = typeof ext.icdCodes === 'string' ? JSON.parse(ext.icdCodes) : ext.icdCodes
      if (Array.isArray(codes) && codes[0]) result.diagnosis = codes[0]
    } catch (_) {}
  }
  if (file.aiSummary) result.treatment = file.aiSummary
  if (ext?.dollarAmounts) {
    try {
      const amts = typeof ext.dollarAmounts === 'string' ? JSON.parse(ext.dollarAmounts) : ext.dollarAmounts
      if (Array.isArray(amts) && amts.length) result.amounts = amts.slice(0, 3).join(', ')
    } catch (_) {}
  }
  result.provider = file.category === 'medical_records' ? 'Medical provider' : file.category
  return result
}

/**
 * Run full recalculation: merge evidence → predict → store → notify
 */
export async function runCaseRecalculation(
  assessmentId: string,
  reason: string
): Promise<RecalculationResult | null> {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        evidenceFiles: {
          include: { extractedData: true }
        },
        predictions: { orderBy: { createdAt: 'desc' }, take: 2 },
        user: { select: { id: true, email: true } }
      }
    })

    if (!assessment) return null

    const factsRaw = typeof assessment.facts === 'string' ? JSON.parse(assessment.facts) : assessment.facts
    const evidenceFiles = assessment.evidenceFiles.map((f) => ({
      id: f.id,
      originalName: f.originalName,
      category: f.category,
      aiClassification: f.aiClassification,
      aiSummary: f.aiSummary,
      aiHighlights: f.aiHighlights,
      ocrText: f.ocrText,
      createdAt: f.createdAt,
      extractedData: f.extractedData?.length
        ? f.extractedData.map((ed) => ({
            totalAmount: ed.totalAmount,
            dollarAmounts: ed.dollarAmounts,
            icdCodes: ed.icdCodes,
            cptCodes: ed.cptCodes,
            dates: ed.dates
          }))
        : null
    }))

    const mergedFacts = mergeEvidenceIntoFacts(factsRaw, evidenceFiles)
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { facts: JSON.stringify(mergedFacts) }
    })

    const assessmentUpdated = await prisma.assessment.findUnique({
      where: { id: assessmentId }
    })
    if (!assessmentUpdated) return null

    const features = computeFeatures(assessmentUpdated)
    const result = await predictViability(features)

    const newBands = result.value_bands
    const prevPred = assessment.predictions[0]
    const prevBands = prevPred ? (JSON.parse(prevPred.bands) as { p25: number; median: number; p75: number }) : null

    const prediction = await prisma.prediction.create({
      data: {
        assessmentId,
        modelVersion: MODEL_VERSION,
        viability: JSON.stringify(result.viability),
        bands: JSON.stringify(newBands),
        explain: JSON.stringify({ ...result.explainability, reason, trigger: reason })
      }
    })

    let plaintiffNotified = false
    let attorneysNotified = 0

    const valueIncreasePercent = prevBands
      ? ((newBands.median - prevBands.median) / prevBands.median) * 100
      : 100
    const hasNewLiabilityEvidence = evidenceFiles.some(
      (f) => f.aiClassification === 'police_report' || f.category === 'police_report'
    )
    const isMaterialForAttorney = valueIncreasePercent >= 20 || hasNewLiabilityEvidence

    if (prevBands && valueIncreasePercent > 0 && assessment.userId) {
      plaintiffNotified = await sendPlaintiffCaseValueUpdated(
        assessmentId,
        assessment.userId,
        prevBands,
        newBands,
        reason
      )
    }

    if (isMaterialForAttorney) {
      attorneysNotified = await sendAttorneyCaseMaterialUpdate(
        assessmentId,
        newBands,
        reason,
        hasNewLiabilityEvidence
      )
    }

    logger.info('Case recalculated', {
      assessmentId,
      reason,
      modelVersion: MODEL_VERSION,
      plaintiffNotified,
      attorneysNotified,
      valueIncreasePercent: valueIncreasePercent.toFixed(1)
    })

    return {
      predictionId: prediction.id,
      previousValue: prevBands,
      newValue: newBands,
      plaintiffNotified,
      attorneysNotified,
      reason
    }
  } catch (err: unknown) {
    logger.error('Case recalculation failed', { assessmentId, reason, error: (err as Error).message })
    return null
  }
}
