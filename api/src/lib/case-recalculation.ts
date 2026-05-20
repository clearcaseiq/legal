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
function mergeEvidenceIntoFacts(
  facts: Record<string, unknown>,
  evidenceFiles: Array<{
    originalName?: string | null
    category: string
    aiClassification?: string | null
    aiSummary?: string | null
    aiHighlights?: string | null
    ocrText?: string | null
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

  const intakeMedCharges = Number(damages.intake_med_charges ?? damages.med_charges) || 0
  const intakeMedPaid = Number(damages.intake_med_paid ?? damages.med_paid) || 0
  let extractedMedCharges = 0
  let extractedMedPaid = 0
  let extractedWageLoss = 0

  for (const file of evidenceFiles) {
    const cat = file.aiClassification || file.category
    if (cat === 'police_report' || file.category === 'police_report') evidence.add('police_report')
    if (cat === 'bills' || file.category === 'bills') evidence.add('medical_bills')
    if (cat === 'medical_records' || file.category === 'medical_records') evidence.add('medical_records')
    if (cat === 'photos' || file.category === 'photos') evidence.add('photos')

    const ext = file.extractedData?.[0]
    if (ext) {
      const amt = ext.totalAmount ?? 0
      if (amt > 0) {
        if (isLostWageEvidence(file)) {
          extractedWageLoss += extractWageLossAmount(file.ocrText || '', amt)
        } else if (isMedicalChargeEvidence(file)) {
          extractedMedCharges += amt
          extractedMedPaid += amt * 0.8 // Assume ~80% paid
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

  const totalMedCharges = Math.max(intakeMedCharges, extractedMedCharges)
  const totalMedPaid = Math.max(intakeMedPaid, extractedMedPaid)
  const intakeWageLoss = Number(damages.wage_loss) || 0
  const totalWageLoss = Math.max(intakeWageLoss, extractedWageLoss)
  merged.damages = {
    ...damages,
    intake_med_charges: intakeMedCharges,
    intake_med_paid: intakeMedPaid,
    extracted_med_charges: extractedMedCharges,
    extracted_med_paid: extractedMedPaid,
    extracted_wage_loss: extractedWageLoss,
    med_charges: totalMedCharges,
    med_paid: totalMedPaid,
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
  const match = ocrText.match(/\b(?:total\s+)?(?:wage\s+loss|lost\s+wages)\b[^$]{0,80}\$([\d,]+(?:\.\d{1,2})?)/i)
  if (!match) return fallback
  const amount = Number(match[1].replace(/,/g, ''))
  return Number.isFinite(amount) && amount > 0 ? amount : fallback
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
      originalName: f.originalName,
      category: f.category,
      aiClassification: f.aiClassification,
      aiSummary: f.aiSummary,
      aiHighlights: f.aiHighlights,
      ocrText: f.ocrText,
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
