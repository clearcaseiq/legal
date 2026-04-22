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
    category: string
    aiClassification?: string | null
    aiSummary?: string | null
    aiHighlights?: string | null
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

  let totalMedCharges = Number(damages.med_charges) || 0
  let totalMedPaid = Number(damages.med_paid) || 0

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
        totalMedCharges += amt
        totalMedPaid += amt * 0.8 // Assume ~80% paid
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

  merged.damages = { ...damages, med_charges: totalMedCharges, med_paid: totalMedPaid }
  merged.treatment = treatment
  merged.evidence = Array.from(evidence)
  return merged
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
      category: f.category,
      aiClassification: f.aiClassification,
      aiSummary: f.aiSummary,
      aiHighlights: f.aiHighlights,
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
