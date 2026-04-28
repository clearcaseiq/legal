import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { isAdminEmail } from '../lib/admin-access'
import { CaseForRouting, AttorneyForRouting, routeCaseToAttorneys, filterEligibleAttorneys } from '../lib/routing'
import { runRoutingEngine } from '../lib/routing-engine'
import { startAssessmentRouting } from '../lib/assessment-routing'
import { runEscalationWave } from '../lib/routing-lifecycle'
import { routeTier1Case } from '../lib/tier1-routing'
import { sendCaseOfferSms } from '../lib/sms'
import { routeTier2Case } from '../lib/tier2-routing'
import { assignCaseTier } from '../lib/case-tier-classifier'
import { getConfiguredWaveWaitHours, getMatchingRules, saveMatchingRules } from '../lib/matching-rules-config'
import { getAdminCalendarHealth } from '../lib/calendar-sync'

const router: ExpressRouter = Router()
const prismaAny = prisma as any

function safeJsonParse<T = unknown>(value: string | null | undefined): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function safeJsonArray(value: string | null | undefined): string[] {
  const parsed = safeJsonParse<unknown>(value)
  return Array.isArray(parsed) ? parsed.map((item) => String(item)) : []
}

function extractDocumentSignals(ocrText: string) {
  const dollarAmounts = ocrText.match(/\$[\d,]+(?:\.\d{2})?/g) || []
  const dates = ocrText.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/g) || []
  const icdCodes = ocrText.match(/\b[A-Z]\d{2}(?:\.\d+)?\b/g) || []
  const cptCodes = ocrText.match(/\b\d{5}\b/g) || []
  const totalAmount = dollarAmounts.reduce((sum, amount) => {
    const numeric = Number(amount.replace(/[$,]/g, ''))
    return Number.isFinite(numeric) ? sum + numeric : sum
  }, 0)
  const keywords = ocrText
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9-]/g, ''))
    .filter((word) => word.length > 3 && !['with', 'from', 'that', 'this', 'have', 'were'].includes(word))
    .slice(0, 25)

  return {
    dollarAmounts,
    dates,
    icdCodes,
    cptCodes,
    totalAmount,
    keywords,
    confidence: ocrText.trim() ? 0.78 : 0.15,
  }
}

function formatAdminDocument(file: any) {
  const latestExtraction = file.extractedData?.[0] || null
  const latestJob = file.processingJobs?.[0] || null
  const chronologyJob = (file.processingJobs || []).find((job: any) => job.jobType === 'chronology_approval')
  const hasOcrText = Boolean(file.ocrText && file.ocrText.trim())
  const dateCount = safeJsonArray(latestExtraction?.dates).length
  const dollarCount = safeJsonArray(latestExtraction?.dollarAmounts).length
  const billTotal = latestExtraction?.totalAmount ?? null

  return {
    id: file.id,
    originalName: file.originalName,
    mimetype: file.mimetype,
    size: file.size,
    fileUrl: file.fileUrl,
    category: file.category,
    subcategory: file.subcategory,
    dataType: file.dataType,
    description: file.description,
    processingStatus: file.processingStatus,
    ocrStatus: file.processingStatus === 'completed' && hasOcrText
      ? 'completed'
      : file.processingStatus === 'failed'
        ? 'failed'
        : file.processingStatus === 'processing'
          ? 'processing'
          : 'pending',
    extractionStatus: latestExtraction
      ? latestExtraction.isManualReview
        ? 'needs_review'
        : 'completed'
      : file.processingStatus === 'completed'
        ? 'needs_review'
        : 'pending',
    chronologyStatus: chronologyJob
      ? chronologyJob.status === 'completed'
        ? 'approved'
        : chronologyJob.status
      : dateCount > 0
        ? 'ready'
        : 'not_ready',
    billExtractionStatus: file.category === 'bills' || dollarCount > 0 || billTotal
      ? billTotal
        ? 'completed'
        : 'needs_review'
      : 'not_applicable',
    aiSummary: file.aiSummary,
    aiClassification: file.aiClassification,
    aiHighlights: safeJsonParse<string[]>(file.aiHighlights) || [],
    ocrPreview: hasOcrText ? file.ocrText.slice(0, 500) : '',
    extractedData: latestExtraction ? {
      id: latestExtraction.id,
      icdCodes: safeJsonArray(latestExtraction.icdCodes),
      cptCodes: safeJsonArray(latestExtraction.cptCodes),
      dollarAmounts: safeJsonArray(latestExtraction.dollarAmounts),
      totalAmount: latestExtraction.totalAmount,
      currency: latestExtraction.currency,
      dates: safeJsonArray(latestExtraction.dates),
      timeline: safeJsonParse(latestExtraction.timeline),
      entities: safeJsonParse(latestExtraction.entities),
      keywords: safeJsonArray(latestExtraction.keywords),
      confidence: latestExtraction.confidence,
      isManualReview: latestExtraction.isManualReview,
      updatedAt: latestExtraction.updatedAt,
    } : null,
    latestJob: latestJob ? {
      id: latestJob.id,
      jobType: latestJob.jobType,
      status: latestJob.status,
      errorMessage: latestJob.errorMessage,
      createdAt: latestJob.createdAt,
      completedAt: latestJob.completedAt,
    } : null,
    case: file.assessment ? {
      id: file.assessment.id,
      claimType: file.assessment.claimType,
      venueState: file.assessment.venueState,
      venueCounty: file.assessment.venueCounty,
      status: file.assessment.status,
    } : null,
    plaintiff: file.user ? {
      id: file.user.id,
      email: file.user.email,
      name: `${file.user.firstName || ''} ${file.user.lastName || ''}`.trim() || file.user.email,
    } : null,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  }
}

function buildDecisionMemoryWhere(filters?: Record<string, unknown>) {
  const where: Record<string, unknown> = {}
  if (!filters) return where

  if (filters.overrideOnly === true) {
    where.override = true
  }
  if (typeof filters.outcomeStatus === 'string' && filters.outcomeStatus.trim()) {
    where.outcomeStatus = filters.outcomeStatus.trim()
  }
  if (typeof filters.attorneyDecision === 'string' && filters.attorneyDecision.trim()) {
    where.attorneyDecision = filters.attorneyDecision.trim()
  }
  if (typeof filters.recommendedDecision === 'string' && filters.recommendedDecision.trim()) {
    where.recommendedDecision = filters.recommendedDecision.trim()
  }

  return where
}

async function writeAdminAudit(
  req: AuthRequest,
  input: {
    action: string
    entityType: string
    entityId?: string | null
    statusCode?: number
    metadata?: Record<string, unknown>
  }
) {
  await prisma.auditLog.create({
    data: {
      userId: req.user?.id || null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || null,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
      statusCode: input.statusCode || 200,
      metadata: JSON.stringify({
        ...(input.metadata || {}),
        actorEmail: req.user?.email || null,
        path: req.originalUrl,
        method: req.method,
      }),
    },
  })
}

type LeadScores = {
  viabilityScore: number
  liabilityScore: number
  causationScore: number
  damagesScore: number
}

function getLeadScores(prediction?: { viability?: any }): LeadScores {
  const viability = prediction?.viability || {}
  return {
    viabilityScore: viability.overall ?? 0,
    liabilityScore: viability.liability ?? 0,
    causationScore: viability.causation ?? 0,
    damagesScore: viability.damages ?? 0
  }
}

async function upsertLeadSubmission(
  assessmentId: string,
  attorneyId: string,
  prediction?: { viability?: any }
) {
  const scores = getLeadScores(prediction)
  const evidenceChecklist = JSON.stringify({ required: [] })

  await prisma.leadSubmission.upsert({
    where: { assessmentId },
    create: {
      assessmentId,
      viabilityScore: scores.viabilityScore,
      liabilityScore: scores.liabilityScore,
      causationScore: scores.causationScore,
      damagesScore: scores.damagesScore,
      evidenceChecklist,
      isExclusive: true,
      sourceType: 'admin',
      assignedAttorneyId: attorneyId,
      assignmentType: 'exclusive',
      routingLocked: true,
      status: 'submitted'
    },
    update: {
      viabilityScore: scores.viabilityScore,
      liabilityScore: scores.liabilityScore,
      causationScore: scores.causationScore,
      damagesScore: scores.damagesScore,
      evidenceChecklist,
      isExclusive: true,
      sourceType: 'admin',
      assignedAttorneyId: attorneyId,
      assignmentType: 'exclusive',
      routingLocked: true,
      status: 'submitted'
    }
  })
}

// Admin middleware
async function adminMiddleware(req: AuthRequest, res: any, next: any) {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (!isAdminEmail(req.user.email)) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    next()
  } catch (error) {
    logger.error('Admin middleware error', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ===== Admin Dashboard Stats =====
router.get('/stats', authMiddleware, adminMiddleware, async (_req: AuthRequest, res) => {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)
    const sevenDaysAgo = new Date(todayStart)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [
      newCasesToday,
      queueAssessments,
      introStats,
      acceptedWithTime,
      totalSubmitted,
      matchedCases,
      intakeByDay,
      byClaimType,
      routed,
      accepted,
    ] = await Promise.all([
      prisma.assessment.count({
        where: { createdAt: { gte: todayStart } }
      }),
      prisma.assessment.findMany({
        where: { status: { in: ['DRAFT', 'COMPLETED'] } },
        include: {
          _count: { select: { introductions: true } },
          leadSubmission: { select: { routingLocked: true } },
        },
      }),
      prisma.introduction.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      prisma.introduction.findMany({
        where: { status: 'ACCEPTED', respondedAt: { not: null } },
        select: { requestedAt: true, respondedAt: true }
      }),
      prisma.assessment.count({
        where: { status: 'COMPLETED' }
      }),
      prisma.leadSubmission.count({
        where: { routingLocked: true }
      }),
      prisma.assessment.groupBy({
        by: ['createdAt'],
        where: { createdAt: { gte: sevenDaysAgo } },
        _count: { id: true }
      }),
      prisma.assessment.groupBy({
        by: ['claimType'],
        where: { createdAt: { gte: sevenDaysAgo } },
        _count: { id: true }
      }),
      prisma.introduction.count(),
      prisma.introduction.count({ where: { status: 'ACCEPTED' } }),
    ])
    const routableCases = queueAssessments.filter((a) => a._count.introductions === 0).length

    // Cases with introductions but no accept yet (waiting for attorney response)
    const waitingForResponse = queueAssessments.filter(
      (a) => a._count.introductions > 0 && !a.leadSubmission?.routingLocked
    ).length

    // Cases manually held (placeholder - no explicit hold flag yet)
    const casesManuallyHeld = 0

    const totalIntros = introStats.reduce((s, i) => s + i._count.id, 0)
    const acceptedIntros = introStats.find(i => i.status === 'ACCEPTED')?._count.id ?? 0
    const attorneyAcceptanceRate = totalIntros > 0 ? Math.round((acceptedIntros / totalIntros) * 100) : 0

    const responseTimes = acceptedWithTime
      .map(i => i.respondedAt ? new Date(i.respondedAt).getTime() - new Date(i.requestedAt).getTime() : 0)
      .filter(t => t > 0)
    const medianResponseMs = responseTimes.length > 0
      ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)]
      : 0

    const matchRate = totalSubmitted > 0 ? Math.round((matchedCases / totalSubmitted) * 100) : 0

    // Cases aging > 24 hours (in queue, created before yesterday)
    const casesAging24h = queueAssessments.filter(
      a => a._count.introductions === 0 && new Date(a.createdAt) < yesterdayStart
    ).length

    const dayBuckets: Record<string, number> = {}
    for (let d = 0; d < 7; d++) {
      const dte = new Date(sevenDaysAgo)
      dte.setDate(dte.getDate() + d)
      const key = dte.toISOString().split('T')[0]
      dayBuckets[key] = 0
    }
    intakeByDay.forEach(g => {
      const key = new Date(g.createdAt).toISOString().split('T')[0]
      if (dayBuckets[key] !== undefined) dayBuckets[key] += g._count.id
    })

    // Routing funnel counts
    const submitted = totalSubmitted
    const qualified = submitted // simplified
    const engaged = matchedCases

    res.json({
      cards: {
        newCasesToday: newCasesToday,
        routableCases,
        casesWaitingForResponse: waitingForResponse,
        casesManuallyHeld: casesManuallyHeld,
        attorneyAcceptanceRate,
        medianTimeToFirstResponseMinutes: Math.round(medianResponseMs / 60000),
        plaintiffMatchRate: matchRate,
        casesAgingOver24h: casesAging24h
      },
      intakeVolume: Object.entries(dayBuckets).sort((a, b) => a[0].localeCompare(b[0])),
      casesByClaimType: byClaimType.map(c => ({ claimType: c.claimType, count: c._count.id })),
      routingFunnel: {
        submitted,
        qualified,
        routed,
        attorneyAccepted: accepted,
        consultationScheduled: engaged,
        engaged
      }
    })
  } catch (error: any) {
    logger.error('Failed to get admin stats', { error: error?.message, stack: error?.stack })
    res.status(500).json({
      error: 'Internal server error',
      detail: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    })
  }
})

router.get('/calendar-sync/health', authMiddleware, adminMiddleware, async (_req: AuthRequest, res) => {
  try {
    const health = await getAdminCalendarHealth()
    res.json(health)
  } catch (error: any) {
    logger.error('Failed to get admin calendar sync health', { error: error?.message, stack: error?.stack })
    res.status(500).json({
      error: 'Internal server error',
      detail: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    })
  }
})

// Matching rules (routing config)
router.get('/matching-rules', authMiddleware, adminMiddleware, async (_req: AuthRequest, res) => {
  try {
    const config = await getMatchingRules()
    res.json(config)
  } catch (error: any) {
    logger.error('Failed to get matching rules', { error, message: error?.message })
    res.status(500).json({
      error: 'Internal server error',
      detail: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    })
  }
})

router.put('/matching-rules', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const config = await saveMatchingRules(req.body)
    await writeAdminAudit(req, {
      action: 'routing_rules_updated',
      entityType: 'routing_rules',
      entityId: 'global',
      metadata: {
        updatedFields: Object.keys(req.body || {}),
      },
    })
    res.json(config)
  } catch (error) {
    logger.error('Failed to save matching rules', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Admin analytics (intake, routing, attorney performance, case quality, revenue)
router.get('/analytics', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const days = Math.min(90, Math.max(7, parseInt(req.query.days as string) || 30))
    const since = new Date()
    since.setDate(since.getDate() - days)

    const [assessments, introductions, matched, decisionMemories, retrainingRequests, routingAuditActions] = await Promise.all([
      prisma.assessment.findMany({
        where: { createdAt: { gte: since }, status: 'COMPLETED' },
        select: {
          id: true,
          claimType: true,
          venueState: true,
          createdAt: true,
          leadSubmission: {
            select: {
              sourceType: true,
            },
          },
          predictions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              viability: true,
              bands: true,
            },
          },
        },
      }),
      prisma.introduction.findMany({
        where: { assessment: { createdAt: { gte: since } } },
        select: {
          attorneyId: true,
          status: true,
          waveNumber: true,
          requestedAt: true,
          respondedAt: true,
        },
      }),
      prisma.leadSubmission.count({
        where: {
          routingLocked: true,
          assessment: { createdAt: { gte: since }, status: 'COMPLETED' }
        }
      }),
      prisma.decisionMemory.findMany({
        where: {
          createdAt: { gte: since },
        },
        select: {
          override: true,
          outcomeStatus: true,
          recommendedConfidence: true,
        },
      }),
      prisma.auditLog.count({
        where: {
          action: 'routing_feedback_retraining_requested',
          createdAt: { gte: since },
        },
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          createdAt: { gte: since },
          action: {
            in: [
              'routing_rules_updated',
              'case_manual_review_held',
              'case_manual_review_release',
              'case_manual_review_reject',
              'case_manual_review_request_info',
              'case_manual_review_compliance',
              'case_manual_routed',
              'case_manual_route_failed',
              'case_auto_routed',
              'case_auto_route_failed',
              'case_routing_simulated',
              'case_route_engine_executed',
            ],
          },
        },
        _count: {
          _all: true,
        },
      }),
    ])

    const byClaimType: Record<string, number> = {}
    const byState: Record<string, number> = {}
    const bySource: Record<string, number> = {}
    const intakeByDay: Record<string, number> = {}

    for (let d = 0; d < days; d++) {
      const dte = new Date(since)
      dte.setDate(dte.getDate() + d)
      intakeByDay[dte.toISOString().split('T')[0]] = 0
    }

    for (const a of assessments) {
      byClaimType[a.claimType || 'unknown'] = (byClaimType[a.claimType || 'unknown'] || 0) + 1
      byState[a.venueState || 'unknown'] = (byState[a.venueState || 'unknown'] || 0) + 1
      const src = a.leadSubmission?.sourceType || 'unknown'
      bySource[src] = (bySource[src] || 0) + 1
      const key = new Date(a.createdAt).toISOString().split('T')[0]
      if (intakeByDay[key] !== undefined) intakeByDay[key]++
    }

    const byWave: Record<number, { total: number; accepted: number; declined: number }> = {}
    const responseTimes: number[] = []

    for (const i of introductions) {
      if (!byWave[i.waveNumber]) byWave[i.waveNumber] = { total: 0, accepted: 0, declined: 0 }
      byWave[i.waveNumber].total++
      if (i.status === 'ACCEPTED') byWave[i.waveNumber].accepted++
      if (i.status === 'DECLINED') byWave[i.waveNumber].declined++
      if (i.status === 'ACCEPTED' && i.respondedAt) {
        const ms = new Date(i.respondedAt).getTime() - new Date(i.requestedAt).getTime()
        if (ms > 0) responseTimes.push(ms)
      }
    }

    const timeToFirstAcceptMinutes = responseTimes.length > 0
      ? Math.round(responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)] / 60000)
      : null

    // Attorney performance
    const attorneyIds = [...new Set(introductions.map(i => i.attorneyId))]
    const attorneyMap: Record<string, string> = {}
    if (attorneyIds.length > 0) {
      const attorneys = await prisma.attorney.findMany({
        where: { id: { in: attorneyIds } },
        select: { id: true, name: true }
      })
      for (const a of attorneys) attorneyMap[a.id] = a.name
    }

    const attorneyPerformance: Array<{ attorneyId: string; name: string; total: number; accepted: number; declined: number; acceptanceRate: number }> = attorneyIds.map(aid => {
      const intros = introductions.filter(i => i.attorneyId === aid)
      const accepted = intros.filter(i => i.status === 'ACCEPTED').length
      const declined = intros.filter(i => i.status === 'DECLINED').length
      return {
        attorneyId: aid,
        name: attorneyMap[aid] || 'Unknown',
        total: intros.length,
        accepted,
        declined,
        acceptanceRate: intros.length > 0 ? Math.round((accepted / intros.length) * 100) : 0
      }
    })
    attorneyPerformance.sort((a, b) => b.total - a.total)

    // Case quality (viability scores)
    const viabilityScores: number[] = []
    const valueEstimates: number[] = []
    for (const a of assessments) {
      const pred = a.predictions[0]
      if (pred?.viability) {
        try {
          const v = JSON.parse(pred.viability)
          if (v.overall != null) viabilityScores.push(v.overall)
        } catch {}
      }
      if (pred?.bands) {
        try {
          const b = JSON.parse(pred.bands)
          if (b.median != null) valueEstimates.push(b.median)
        } catch {}
      }
    }

    const avgViability = viabilityScores.length > 0
      ? Math.round((viabilityScores.reduce((s, v) => s + v, 0) / viabilityScores.length) * 100)
      : null
    const avgValue = valueEstimates.length > 0
      ? Math.round(valueEstimates.reduce((s, v) => s + v, 0) / valueEstimates.length)
      : null

    const totalCompleted = assessments.length
    const plaintiffConversionRate = totalCompleted > 0 ? Math.round((matched / totalCompleted) * 100) : 0
    const outcomesRecorded = decisionMemories.filter((memory) => Boolean(memory.outcomeStatus)).length
    const overrides = decisionMemories.filter((memory) => Boolean(memory.override)).length
    const avgRecommendedConfidence = decisionMemories.length > 0
      ? Math.round(
          (decisionMemories.reduce((sum, memory) => sum + (memory.recommendedConfidence || 0), 0) / decisionMemories.length) * 100
        )
      : 0

    // Routing funnel
    const submitted = totalCompleted
    const routed = introductions.length
    const acceptedTotal = introductions.filter(i => i.status === 'ACCEPTED').length
    const engaged = matched

    res.json({
      periodDays: days,
      intake: {
        total: totalCompleted,
        byClaimType: Object.entries(byClaimType).map(([k, v]) => ({ claimType: k, count: v })),
        byState: Object.entries(byState).map(([k, v]) => ({ state: k, count: v })),
        bySource: Object.entries(bySource).map(([k, v]) => ({ source: k, count: v })),
        byDay: Object.entries(intakeByDay).sort((a, b) => a[0].localeCompare(b[0]))
      },
      routing: {
        acceptanceByWave: Object.entries(byWave).map(([w, v]) => ({
          wave: parseInt(w),
          total: v.total,
          accepted: v.accepted,
          declined: v.declined,
          acceptanceRate: v.total > 0 ? Math.round((v.accepted / v.total) * 100) : 0
        })).sort((a, b) => a.wave - b.wave),
        timeToFirstAcceptMinutes,
        funnel: { submitted, routed, attorneyAccepted: acceptedTotal, engaged },
        feedbackLoop: {
          decisionMemories: decisionMemories.length,
          outcomesRecorded,
          overrides,
          overrideRate: decisionMemories.length > 0 ? Math.round((overrides / decisionMemories.length) * 100) : 0,
          averageRecommendedConfidence: avgRecommendedConfidence,
          retrainingRequests,
        },
        auditActions: routingAuditActions.map((row) => ({
          action: row.action,
          count: row._count._all,
        })),
      },
      attorneyPerformance: attorneyPerformance.slice(0, 20),
      caseQuality: {
        avgViability,
        avgValue,
        casesWithPrediction: viabilityScores.length
      },
      plaintiffConversion: {
        total: totalCompleted,
        matched,
        rate: plaintiffConversionRate
      }
    })
  } catch (error: any) {
    logger.error('Failed to get admin analytics', { error, message: error?.message, stack: error?.stack })
    res.status(500).json({
      error: 'Internal server error',
      detail: process.env.NODE_ENV === 'development' ? error?.message : undefined
    })
  }
})

// Manual review queue
const MANUAL_REVIEW_REASONS = [
  'low_confidence', 'duplicate', 'conflicting_facts', 'suspicious_documents',
  'near_sol', 'unsupported_jurisdiction', 'premium_case', 'ocr_failure'
] as const

router.get('/manual-review', authMiddleware, adminMiddleware, async (_req: AuthRequest, res) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: { manualReviewStatus: 'pending' },
      select: {
        id: true,
        claimType: true,
        venueState: true,
        venueCounty: true,
        manualReviewReason: true,
        manualReviewHeldAt: true,
        manualReviewNote: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { viability: true, bands: true }
        },
        _count: { select: { introductions: true, files: true } }
      },
      orderBy: { manualReviewHeldAt: 'asc' }
    })

    const cases = assessments.map(a => {
      const pred = a.predictions[0]
      const viability = pred?.viability ? JSON.parse(pred.viability) : {}
      const bands = pred?.bands ? JSON.parse(pred.bands) : {}
      return {
        id: a.id,
        claimType: a.claimType,
        venueState: a.venueState,
        venueCounty: a.venueCounty,
        manualReviewReason: a.manualReviewReason,
        manualReviewHeldAt: a.manualReviewHeldAt,
        manualReviewNote: a.manualReviewNote,
        caseScore: viability.overall ?? 0,
        valueEstimate: bands.median,
        user: a.user,
        counts: { introductions: a._count.introductions, files: a._count.files }
      }
    })

    res.json({ cases })
  } catch (error) {
    logger.error('Failed to get manual review queue', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/manual-review/:caseId/action', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { caseId } = req.params
    const { action, note } = req.body as { action: string; note?: string }
    const validActions = ['release', 'reject', 'request_info', 'compliance']
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Use: release, reject, request_info, compliance' })
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: caseId },
      include: { leadSubmission: true }
    })
    if (!assessment) {
      return res.status(404).json({ error: 'Case not found' })
    }
    if (assessment.manualReviewStatus !== 'pending') {
      return res.status(400).json({ error: 'Case is not in manual review queue' })
    }

    const updateData: any = {
      manualReviewStatus: action === 'release' ? 'released' : action === 'reject' ? 'rejected' : action === 'request_info' ? 'request_info' : 'compliance',
      manualReviewNote: note || assessment.manualReviewNote
    }

    await prisma.assessment.update({
      where: { id: caseId },
      data: updateData
    })

    await writeAdminAudit(req, {
      action: `case_manual_review_${action}`,
      entityType: 'assessment',
      entityId: caseId,
      metadata: {
        note: note || null,
        previousStatus: assessment.manualReviewStatus,
        nextStatus: updateData.manualReviewStatus,
      },
    })

    if (action === 'release') {
      // Ensure case can enter routing - clear routing lock if any, create lead submission if needed
      await prisma.leadSubmission.upsert({
        where: { assessmentId: caseId },
        create: {
          assessmentId: caseId,
          viabilityScore: 0.5,
          liabilityScore: 0.5,
          causationScore: 0.5,
          damagesScore: 0.5,
          evidenceChecklist: '{}',
          isExclusive: false,
          sourceType: 'admin',
          routingLocked: false
        },
        update: { routingLocked: false }
      })
    }

    res.json({ ok: true, action })
  } catch (error) {
    logger.error('Failed to process manual review action', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/manual-review/:caseId/hold', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { caseId } = req.params
    const { reason, note } = req.body as { reason: string; note?: string }
    if (!MANUAL_REVIEW_REASONS.includes(reason as any)) {
      return res.status(400).json({ error: `Invalid reason. Use one of: ${MANUAL_REVIEW_REASONS.join(', ')}` })
    }

    const assessment = await prisma.assessment.findUnique({ where: { id: caseId } })
    if (!assessment) {
      return res.status(404).json({ error: 'Case not found' })
    }

    await prisma.assessment.update({
      where: { id: caseId },
      data: {
        manualReviewStatus: 'pending',
        manualReviewReason: reason,
        manualReviewHeldAt: new Date(),
        manualReviewNote: note || null
      }
    })

    await writeAdminAudit(req, {
      action: 'case_manual_review_held',
      entityType: 'assessment',
      entityId: caseId,
      metadata: {
        reason,
        note: note || null,
      },
    })

    res.json({ ok: true })
  } catch (error) {
    logger.error('Failed to hold case for manual review', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get routing queue (cases currently in routing - have introductions, not yet accepted)
router.get('/routing-queue', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: {
        status: 'COMPLETED',
        introductions: { some: {} },
        OR: [
          { leadSubmission: { is: null } },
          { leadSubmission: { routingLocked: false } }
        ]
      },
      select: {
        id: true,
        claimType: true,
        venueState: true,
        venueCounty: true,
        createdAt: true,
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { bands: true, viability: true }
        },
        introductions: {
          orderBy: { createdAt: 'desc' },
          select: {
            status: true,
            createdAt: true,
            attorney: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          }
        },
        routingWaves: {
          orderBy: { waveNumber: 'desc' },
          take: 1,
          select: { waveNumber: true, nextEscalationAt: true }
        },
        _count: { select: { introductions: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    const queue = assessments.map(a => {
      const pred = a.predictions[0]
      const bands = pred?.bands ? JSON.parse(pred.bands) : {}
      const viability = pred?.viability ? JSON.parse(pred.viability) : {}
      const latestWave = a.routingWaves[0]
      const responses = a.introductions.filter(i => i.status !== 'PENDING').length
      const latestIntroduction = a.introductions[0]

      return {
        id: a.id,
        claimType: a.claimType,
        venueState: a.venueState,
        venueCounty: a.venueCounty,
        valueEstimate: bands.median,
        caseScore: viability.overall ?? 0,
        currentWave: latestWave?.waveNumber ?? 1,
        attorneysContacted: a._count.introductions,
        responsesReceived: responses,
        latestAttorneyContacted: latestIntroduction?.attorney
          ? {
              id: latestIntroduction.attorney.id,
              name: latestIntroduction.attorney.name,
              email: latestIntroduction.attorney.email,
              status: latestIntroduction.status,
              contactedAt: latestIntroduction.createdAt,
            }
          : null,
        timeInQueue: a.createdAt,
        nextEscalationTime: latestWave?.nextEscalationAt,
        adminStatus: 'active'
      }
    })

    res.json({ cases: queue })
  } catch (error) {
    logger.error('Failed to get routing queue', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single attorney detail for admin
router.get('/attorneys/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const [attorney, verifiedReviewCount] = await Promise.all([
      prisma.attorney.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          isVerified: true,
          responseTimeHours: true,
          averageRating: true,
          totalReviews: true,
          specialties: true,
          venues: true,
          lawFirm: {
            select: {
              id: true,
              name: true,
            },
          },
          attorneyProfile: {
            select: {
              jurisdictions: true,
            },
          },
          dashboard: {
            select: {
              id: true,
            },
          },
          introductions: {
            select: {
              status: true,
              createdAt: true,
              requestedAt: true,
              respondedAt: true,
              assessment: { select: { id: true, claimType: true, venueState: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 50
          },
          _count: { select: { introductions: true } }
        }
      }),
      prisma.attorneyReview.count({
        where: {
          attorneyId: id,
          isVerified: true,
        },
      }),
    ])

    if (!attorney) {
      return res.status(404).json({ error: 'Attorney not found' })
    }

    // Also fetch cases assigned via LeadSubmission (admin assign, etc.) - these may not have Introduction
    const assignedLeads = await prisma.leadSubmission.findMany({
      where: { assignedAttorneyId: id },
      select: {
        assessmentId: true,
        status: true,
        submittedAt: true,
        assessment: { select: { id: true, claimType: true, venueState: true } },
      },
      orderBy: { submittedAt: 'desc' },
      take: 50
    })

    const totalIntros = attorney._count.introductions
    const accepted = attorney.introductions.filter(i => i.status === 'ACCEPTED').length
    const declined = attorney.introductions.filter(i => i.status === 'DECLINED').length
    const pending = attorney.introductions.filter(i => i.status === 'PENDING').length
    const responseTimes = attorney.introductions
      .filter(i => i.status === 'ACCEPTED' && i.respondedAt)
      .map(i => new Date(i.respondedAt!).getTime() - new Date(i.requestedAt).getTime())
    const medianResponseMs = responseTimes.length > 0
      ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)]
      : 0

    // Merge Introduction cases + LeadSubmission-assigned cases; dedupe by assessmentId; prefer Introduction status
    const seenIds = new Set<string>()
    const fromIntros = attorney.introductions.map(i => ({
      id: i.assessment.id,
      claimType: i.assessment.claimType,
      venueState: i.assessment.venueState,
      status: i.status,
      createdAt: i.createdAt
    }))
    for (const c of fromIntros) {
      seenIds.add(c.id)
    }
    const fromLeads = assignedLeads
      .filter(l => !seenIds.has(l.assessmentId))
      .map(l => ({
        id: l.assessment.id,
        claimType: l.assessment.claimType,
        venueState: l.assessment.venueState,
        status: l.status === 'contacted' || l.status === 'consulted' || l.status === 'retained' ? 'ACCEPTED' : l.status === 'rejected' ? 'DECLINED' : 'PENDING',
        createdAt: l.submittedAt
      }))
    for (const c of fromLeads) {
      seenIds.add(c.id)
    }
    const recentCases = [...fromIntros, ...fromLeads]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 25)

    res.json({
      ...attorney,
      specialties: attorney.specialties ? JSON.parse(attorney.specialties) : [],
      venues: attorney.venues ? JSON.parse(attorney.venues) : [],
      profile: attorney.attorneyProfile,
      attorneyDashboard: attorney.dashboard,
      verifiedReviewCount,
      performance: {
        acceptanceRate: totalIntros > 0 ? Math.round((accepted / totalIntros) * 100) : 0,
        medianResponseMinutes: Math.round(medianResponseMs / 60000),
        totalRouted: totalIntros,
        accepted,
        declined,
        pending
      },
      recentCases
    })
  } catch (error) {
    logger.error('Failed to get attorney detail', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ===== User & Role Management =====
const RoleUpdateSchema = z.object({
  role: z.enum(['client', 'attorney', 'staff', 'admin'])
})

router.get('/users', authMiddleware, adminMiddleware, async (_req: AuthRequest, res) => {
  try {
    const users = await prismaAny.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ success: true, data: users })
  } catch (error) {
    logger.error('Failed to list users', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/users/:userId/role', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params
    const parsed = RoleUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const updated = await prismaAny.user.update({
      where: { id: userId },
      data: { role: parsed.data.role },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    })

    res.json({ success: true, data: updated })
  } catch (error) {
    logger.error('Failed to update user role', { error, userId: req.params.userId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/firms', authMiddleware, adminMiddleware, async (_req: AuthRequest, res) => {
  try {
    const firms = await prismaAny.lawFirm.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        state: true,
        city: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ success: true, data: firms })
  } catch (error) {
    logger.error('Failed to list firms', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ===== Feature Toggles =====
const FeatureToggleSchema = z.object({
  key: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  scope: z.enum(['global', 'firm', 'user']).optional(),
  lawFirmId: z.string().optional(),
  userId: z.string().optional()
})

router.get('/feature-toggles', authMiddleware, adminMiddleware, async (_req: AuthRequest, res) => {
  try {
    const toggles = await prismaAny.featureToggle.findMany({
      orderBy: { createdAt: 'desc' }
    })
    res.json({ success: true, data: toggles })
  } catch (error) {
    logger.error('Failed to list feature toggles', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/feature-toggles', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const parsed = FeatureToggleSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const toggle = await prismaAny.featureToggle.create({
      data: {
        key: parsed.data.key,
        description: parsed.data.description,
        enabled: parsed.data.enabled ?? false,
        scope: parsed.data.scope ?? 'global',
        lawFirmId: parsed.data.lawFirmId,
        userId: parsed.data.userId
      }
    })

    res.status(201).json({ success: true, data: toggle })
  } catch (error) {
    logger.error('Failed to create feature toggle', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/feature-toggles/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const parsed = FeatureToggleSchema.partial().safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const toggle = await prismaAny.featureToggle.update({
      where: { id },
      data: parsed.data
    })

    res.json({ success: true, data: toggle })
  } catch (error) {
    logger.error('Failed to update feature toggle', { error, id: req.params.id })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ===== Firm-level Settings =====
const FirmSettingSchema = z.object({
  key: z.string().min(1),
  value: z.any()
})

router.get('/firm-settings/:lawFirmId', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { lawFirmId } = req.params
    const settings = await prismaAny.firmSetting.findMany({
      where: { lawFirmId },
      orderBy: { updatedAt: 'desc' }
    })

    res.json({ success: true, data: settings })
  } catch (error) {
    logger.error('Failed to load firm settings', { error, lawFirmId: req.params.lawFirmId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/firm-settings/:lawFirmId', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { lawFirmId } = req.params
    const parsed = FirmSettingSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const value = typeof parsed.data.value === 'string'
      ? parsed.data.value
      : JSON.stringify(parsed.data.value)

    const setting = await prismaAny.firmSetting.upsert({
      where: { lawFirmId_key: { lawFirmId, key: parsed.data.key } },
      update: { value },
      create: { lawFirmId, key: parsed.data.key, value }
    })

    res.json({ success: true, data: setting })
  } catch (error) {
    logger.error('Failed to upsert firm setting', { error, lawFirmId: req.params.lawFirmId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all cases in queue (assessments not yet routed to attorneys)
router.get('/cases/queue', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: {
        status: {
          in: ['DRAFT', 'COMPLETED'] // Cases that are ready but not yet routed
        },
        introductions: { none: {} }
      },
      select: {
        id: true,
        claimType: true,
        venueState: true,
        venueCounty: true,
        status: true,
        facts: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            viability: true,
            bands: true,
            explain: true
          }
        },
        _count: {
          select: {
            files: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const queueCases = assessments.map(assessment => {
        const facts = assessment.facts ? JSON.parse(assessment.facts) : {}
        const latestPrediction = assessment.predictions[0] ? {
          ...assessment.predictions[0],
          viability: JSON.parse(assessment.predictions[0].viability),
          bands: JSON.parse(assessment.predictions[0].bands),
          explain: JSON.parse(assessment.predictions[0].explain)
        } : null

        return {
          id: assessment.id,
          claimType: assessment.claimType,
          venueState: assessment.venueState,
          venueCounty: assessment.venueCounty,
          status: assessment.status,
          facts,
          prediction: latestPrediction,
          user: assessment.user,
          createdAt: assessment.createdAt,
          updatedAt: assessment.updatedAt,
          fileCount: assessment._count.files
        }
      })

    res.json({
      total: queueCases.length,
      cases: queueCases
    })
  } catch (error) {
    logger.error('Failed to get admin queue cases', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all cases (not just queue) - with extended filters
router.get('/cases/all', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      status,
      limit = 100,
      offset = 0,
      claimType,
      state,
      county,
      routingStatus,
      createdToday,
    } = req.query

    const where: any = {}
    if (status) {
      where.status = status as string
    }
    if (claimType) {
      where.claimType = claimType as string
    }
    if (state) {
      where.venueState = (state as string).toUpperCase()
    }
    if (county) {
      where.venueCounty = { contains: county as string, mode: 'insensitive' }
    }
    if (createdToday === '1' || createdToday === 'true') {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      where.createdAt = { gte: todayStart }
    }
    if (routingStatus === 'routed') {
      where.introductions = { some: {} }
    } else if (routingStatus === 'queue') {
      where.introductions = { none: {} }
    } else if (routingStatus === 'accepted') {
      where.leadSubmission = { routingLocked: true }
    } else if (routingStatus === 'waiting') {
      // At least one intro sent, attorney has not accepted (matches admin /stats casesWaitingForResponse)
      where.AND = [
        { introductions: { some: {} } },
        {
          OR: [{ leadSubmission: null }, { leadSubmission: { routingLocked: false } }],
        },
      ]
    }

    const assessments = await prisma.assessment.findMany({
      where,
      select: {
        id: true,
        claimType: true,
        venueState: true,
        venueCounty: true,
        status: true,
        facts: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            viability: true,
            bands: true,
            explain: true
          }
        },
        introductions: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            attorney: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        leadSubmission: {
          select: {
            assignmentType: true,
            routingLocked: true,
            assignedAttorney: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            introductions: true,
            files: true,
            appointments: true,
            chatRooms: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    })

    const cases = assessments.map(assessment => {
      const facts = assessment.facts ? JSON.parse(assessment.facts) : {}
      const latestPrediction = assessment.predictions[0] ? {
        ...assessment.predictions[0],
        viability: JSON.parse(assessment.predictions[0].viability),
        bands: JSON.parse(assessment.predictions[0].bands),
        explain: JSON.parse(assessment.predictions[0].explain)
      } : null

      return {
        id: assessment.id,
        claimType: assessment.claimType,
        venueState: assessment.venueState,
        venueCounty: assessment.venueCounty,
        status: assessment.status,
        facts,
        prediction: latestPrediction,
        user: assessment.user,
        introductions: assessment.introductions.map(intro => ({
          id: intro.id,
          attorney: intro.attorney,
          status: intro.status,
          createdAt: intro.createdAt
        })),
        leadSubmission: assessment.leadSubmission ? {
          assignedAttorney: assessment.leadSubmission.assignedAttorney,
          assignmentType: assessment.leadSubmission.assignmentType,
          routingLocked: assessment.leadSubmission.routingLocked,
        } : null,
        createdAt: assessment.createdAt,
        updatedAt: assessment.updatedAt,
        counts: {
          files: assessment._count.files,
          introductions: assessment._count.introductions,
          appointments: assessment._count.appointments,
          chatRooms: assessment._count.chatRooms
        }
      }
    })

    res.json({
      total: cases.length,
      cases
    })
  } catch (error) {
    logger.error('Failed to get all admin cases', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single case detail for admin (must be after /cases/queue and /cases/all)
router.get('/cases/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      select: {
        id: true,
        claimType: true,
        venueState: true,
        venueCounty: true,
        status: true,
        facts: true,
        manualReviewStatus: true,
        manualReviewReason: true,
        manualReviewHeldAt: true,
        manualReviewNote: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            createdAt: true,
          }
        },
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            viability: true,
            bands: true,
            explain: true,
          }
        },
        introductions: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            waveNumber: true,
            declineReason: true,
            attorney: { select: { id: true, name: true, email: true } },
          },
          orderBy: { waveNumber: 'asc' }
        },
        leadSubmission: {
          select: {
            id: true,
            assignedAttorneyId: true,
            assignmentType: true,
            sourceType: true,
            routingLocked: true,
            submittedAt: true,
            assignedAttorney: { select: { id: true, name: true, email: true } }
          }
        },
        routingWaves: {
          orderBy: { waveNumber: 'asc' },
          select: {
            id: true,
            waveNumber: true,
            attorneyIds: true,
            sentAt: true,
            nextEscalationAt: true,
            escalatedAt: true,
            createdAt: true,
            updatedAt: true,
          }
        },
        files: {
          select: {
            id: true,
            originalName: true,
            status: true,
            createdAt: true,
          }
        }
      }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Case not found' })
    }

    const routingAudit = await prisma.auditLog.findMany({
      where: {
        entityType: 'assessment',
        entityId: assessment.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    const routingAnalytics = await prisma.routingAnalytics.findMany({
      where: { assessmentId: assessment.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const pred = assessment.predictions[0]
    const facts = assessment.facts ? JSON.parse(assessment.facts) : {}
    const viability = pred?.viability ? JSON.parse(pred.viability) : {}
    const bands = pred?.bands ? JSON.parse(pred.bands) : {}
    const explain = pred?.explain ? JSON.parse(pred.explain) : {}

    res.json({
      id: assessment.id,
      claimType: assessment.claimType,
      venueState: assessment.venueState,
      venueCounty: assessment.venueCounty,
      status: assessment.status,
      facts,
      user: assessment.user,
      prediction: { viability, bands, explain },
      introductions: assessment.introductions,
      leadSubmission: assessment.leadSubmission,
      routingWaves: assessment.routingWaves,
      files: assessment.files,
      manualReviewStatus: assessment.manualReviewStatus,
      manualReviewReason: assessment.manualReviewReason,
      manualReviewHeldAt: assessment.manualReviewHeldAt,
      manualReviewNote: assessment.manualReviewNote,
      routingAudit: routingAudit.map((entry) => ({
        id: entry.id,
        action: entry.action,
        statusCode: entry.statusCode,
        createdAt: entry.createdAt,
        metadata: safeJsonParse(entry.metadata),
      })),
      routingDiagnostics: routingAnalytics.map((entry) => ({
        id: entry.id,
        attorneyId: entry.attorneyId,
        introductionId: entry.introductionId,
        eventType: entry.eventType,
        eventData: safeJsonParse(entry.eventData),
        createdAt: entry.createdAt,
      })),
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt
    })
  } catch (error) {
    logger.error('Failed to get case detail', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Bulk route cases to attorneys
router.post('/cases/route', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    let { caseIds, attorneyId, attorneyEmail, message, skipEligibilityCheck, autoRoute } = req.body

    if (!Array.isArray(caseIds) || caseIds.length === 0) {
      return res.status(400).json({ error: 'caseIds must be a non-empty array' })
    }

    // Resolve attorney by email if attorneyId not provided
    if (!attorneyId && attorneyEmail) {
      const attorneys = await prisma.attorney.findMany({
        where: { isActive: true },
        select: { id: true, email: true, name: true }
      })
      const attorneyByEmail = attorneys.find(
        a => a.email && a.email.toLowerCase() === String(attorneyEmail).toLowerCase()
      )
      if (!attorneyByEmail) {
        return res.status(404).json({
          error: `Attorney not found with email: ${attorneyEmail}`,
          hint: 'Ensure the attorney has completed registration and the email matches exactly.'
        })
      }
      attorneyId = attorneyByEmail.id
      logger.info('Resolved attorney by email', { attorneyEmail, attorneyId, attorneyName: attorneyByEmail.name })
    }

    // Admin manual routing always skips eligibility - admin can force route to any attorney
    if (!autoRoute && attorneyId) {
      skipEligibilityCheck = true
    }

    // If autoRoute is true, use the controlled routing engine (case underwriting + matching + waves)
    if (autoRoute && !attorneyId) {
      const maxPerWave = req.body.maxAttorneysPerWave ?? 3
      const routingResults: Array<{
        caseId: string
        routed: boolean
        attorneyId?: string
        attorneyIds?: string[]
        introductionIds?: string[]
        matchScore?: number
        strategy?: string
        tierNumber?: number | null
        error?: string
        gateReason?: string
        gateStatus?: string
        routingStats?: Record<string, number>
      }> = []

      for (const caseId of caseIds) {
        try {
          const result = await startAssessmentRouting(caseId, {
            maxAttorneysPerWave: maxPerWave,
            skipPreRoutingGate: false,
            dryRun: false
          })

          if (!result.success) {
            routingResults.push({
              caseId,
              routed: false,
              error: result.errors?.[0] ?? 'Routing failed',
              gateReason: result.gateReason,
              gateStatus: result.gateStatus
            })
            continue
          }

          if (!result.routedTo || result.routedTo.length === 0) {
            routingResults.push({
              caseId,
              routed: false,
              error: 'No attorneys routed (wave may be empty)',
              routingStats: {
                candidates: result.candidatesEligible ?? 0,
                qualified: result.candidatesQualified ?? 0
              }
            })
            continue
          }

          routingResults.push({
            caseId,
            routed: true,
            attorneyId: result.routedTo[0],
            attorneyIds: result.routedTo,
            introductionIds: result.introductionIds,
            strategy: result.strategy,
            tierNumber: result.tierNumber,
            routingStats: {
              candidates: result.candidatesEligible ?? 0,
              qualified: result.candidatesQualified ?? 0,
              waveSize: result.waveSize ?? 0
            }
          })
        } catch (error: any) {
          routingResults.push({ caseId, error: error.message, routed: false })
        }
      }

      const successful = routingResults.filter(r => r.routed).length
      const failed = routingResults.filter(r => !r.routed).length

      logger.info('Routing engine completed', {
        totalCases: caseIds.length,
        successful,
        failed
      })

      await Promise.all(routingResults.map((result) =>
        writeAdminAudit(req, {
          action: result.routed ? 'case_auto_routed' : 'case_auto_route_failed',
          entityType: 'assessment',
          entityId: result.caseId,
          metadata: {
            mode: 'auto_route',
            strategy: result.strategy || 'classic',
            tierNumber: result.tierNumber ?? null,
            attorneyIds: result.attorneyIds || [],
            introductionIds: result.introductionIds || [],
            gateReason: result.gateReason || null,
            gateStatus: result.gateStatus || null,
            error: result.error || null,
            routingStats: result.routingStats || null,
          },
        })
      ))

      return res.json({
        success: true,
        autoRouted: true,
        routingEngine: true,
        routed: successful,
        failed,
        results: routingResults
      })
    }

    // Manual routing (existing logic)
    if (!attorneyId) {
      return res.status(400).json({ error: 'attorneyId is required when autoRoute is false' })
    }

    // Verify attorney exists with profile
    const attorney = await prisma.attorney.findUnique({
      where: { id: attorneyId },
      include: {
        attorneyProfile: true
      }
    })

    if (!attorney) {
      return res.status(404).json({ error: 'Attorney not found' })
    }

    const uniqueCaseIds = [...new Set(caseIds.map((caseId) => String(caseId)))]
    let assessments: any[] = []
    let existingIntros: Array<{ assessmentId: string }> = []
    if (skipEligibilityCheck) {
      ;[assessments, existingIntros] = await Promise.all([
        prisma.assessment.findMany({
          where: { id: { in: uniqueCaseIds } },
          select: {
            id: true,
            predictions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { viability: true }
            }
          }
        }),
        prisma.introduction.findMany({
          where: {
            assessmentId: { in: uniqueCaseIds },
            attorneyId
          },
          select: { assessmentId: true }
        })
      ])
    } else {
      ;[assessments, existingIntros] = await Promise.all([
        prisma.assessment.findMany({
          where: { id: { in: uniqueCaseIds } },
          select: {
            id: true,
            claimType: true,
            venueState: true,
            venueCounty: true,
            facts: true,
            predictions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { viability: true, bands: true }
            }
          }
        }),
        prisma.introduction.findMany({
          where: {
            assessmentId: { in: uniqueCaseIds },
            attorneyId
          },
          select: { assessmentId: true }
        })
      ])
    }
    const assessmentById = new Map(assessments.map((assessment) => [assessment.id, assessment]))
    const existingIntroCaseIds = new Set(existingIntros.map((intro) => intro.assessmentId))

    // Create introductions for all cases
    const introductions = []
    const errors = []

    for (const caseId of caseIds) {
      try {
        const assessment = assessmentById.get(caseId)

        if (!assessment) {
          errors.push({ caseId, error: 'Assessment not found' })
          continue
        }

        // Step 0: Hard Eligibility Check (unless skipped)
        if (!skipEligibilityCheck) {
          const caseData: CaseForRouting = {
            id: assessment.id,
            claimType: assessment.claimType,
            venueState: assessment.venueState,
            venueCounty: assessment.venueCounty,
            facts: assessment.facts ? JSON.parse(assessment.facts) : undefined,
            prediction: assessment.predictions[0] ? {
              viability: JSON.parse(assessment.predictions[0].viability),
              bands: JSON.parse(assessment.predictions[0].bands)
            } : undefined
          }

          const attorneyForCheck = {
            id: attorney.id,
            isActive: attorney.isActive,
            isVerified: attorney.isVerified,
            specialties: attorney.specialties,
            attorneyProfile: attorney.attorneyProfile
          }

          const { eligible } = await filterEligibleAttorneys([attorneyForCheck], caseData)

          if (eligible.length === 0) {
            errors.push({ 
              caseId, 
              error: 'Attorney does not meet eligibility requirements for this case' 
            })
            continue
          }
        }

        // Check if introduction already exists
        if (existingIntroCaseIds.has(caseId)) {
          errors.push({ caseId, error: 'Already routed to this attorney' })
          continue
        }

        // Create introduction
        const intro = await prisma.introduction.create({
          data: {
            assessmentId: caseId,
            attorneyId: attorneyId,
            status: 'PENDING',
            message: message || 'Routed by admin',
            requestedAt: new Date()
          }
        })

        const prediction = assessment.predictions?.[0]
        const viability = prediction ? JSON.parse(prediction.viability) : {}
        await upsertLeadSubmission(caseId, attorneyId, { viability })

        await sendCaseOfferSms(attorneyId, intro.id, intro.message, 5)
        existingIntroCaseIds.add(caseId)

        introductions.push(intro)
      } catch (error: any) {
        errors.push({ caseId, error: error.message })
      }
    }

    logger.info('Bulk route cases', { 
      totalCases: caseIds.length,
      successful: introductions.length,
      failed: errors.length,
      attorneyId
    })

    await Promise.all([
      ...introductions.map((intro) =>
        writeAdminAudit(req, {
          action: 'case_manual_routed',
          entityType: 'assessment',
          entityId: intro.assessmentId,
          metadata: {
            attorneyId,
            introductionId: intro.id,
            skipEligibilityCheck: Boolean(skipEligibilityCheck),
            message: message || 'Routed by admin',
          },
        })
      ),
      ...errors.map((entry: any) =>
        writeAdminAudit(req, {
          action: 'case_manual_route_failed',
          entityType: 'assessment',
          entityId: entry.caseId,
          metadata: {
            attorneyId,
            error: entry.error || 'Unknown error',
            skipEligibilityCheck: Boolean(skipEligibilityCheck),
          },
        })
      ),
    ])

    res.json({
      success: true,
      routed: introductions.length,
      failed: errors.length,
      introductions: introductions.map(i => ({
        id: i.id,
        assessmentId: i.assessmentId,
        attorneyId,
        status: i.status
      })),
      errors
    })
  } catch (error) {
    logger.error('Failed to bulk route cases', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Diagnostic: verify routing state for a case (admin debugging)
router.get('/cases/:caseId/routing-state', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { caseId } = req.params
    const { attorneyEmail } = req.query
    const assessment = await prisma.assessment.findUnique({
      where: { id: caseId },
      select: {
        leadSubmission: {
          select: {
            id: true,
            assignedAttorneyId: true,
            assignmentType: true,
          },
        },
        introductions: {
          select: {
            id: true,
            attorneyId: true,
            status: true,
            attorney: { select: { id: true, name: true, email: true } },
          },
        },
      }
    })
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }
    let attorneyByEmail = null
    if (attorneyEmail) {
      const attorneys = await prisma.attorney.findMany({ where: { isActive: true }, select: { id: true, email: true, name: true } })
      attorneyByEmail = attorneys.find(a => a.email?.toLowerCase() === String(attorneyEmail).toLowerCase())
    }
    return res.json({
      assessmentId: caseId,
      hasLeadSubmission: !!assessment.leadSubmission,
      leadSubmission: assessment.leadSubmission ? {
        id: assessment.leadSubmission.id,
        assignedAttorneyId: assessment.leadSubmission.assignedAttorneyId,
        assignmentType: assessment.leadSubmission.assignmentType
      } : null,
      introductions: assessment.introductions.map(i => ({
        id: i.id,
        attorneyId: i.attorneyId,
        attorneyEmail: i.attorney?.email,
        attorneyName: i.attorney?.name,
        status: i.status
      })),
      attorneyLookupByEmail: attorneyEmail ? (attorneyByEmail ? { id: attorneyByEmail.id, email: attorneyByEmail.email, name: attorneyByEmail.name } : { error: 'Not found' }) : null
    })
  } catch (error: any) {
    logger.error('Routing state diagnostic failed', { error: error.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Diagnostic: verify attorney lookup and leads (admin debugging for "routed but not showing on dashboard")
router.get('/attorney-debug', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const email = String(req.query.email || '').trim()
    if (!email) {
      return res.status(400).json({ error: 'Query param email is required (e.g. ?email=aaron.gomez31@lawfirm.com)' })
    }
    const emailLower = email.toLowerCase()
    const attorneys = await prisma.attorney.findMany({
      where: { isActive: true },
      select: { id: true, email: true, name: true }
    })
    const attorney = attorneys.find(a => a.email?.trim().toLowerCase() === emailLower)
    const user = await prisma.user.findUnique({
      where: { email: email },
      select: { id: true, email: true, firstName: true, lastName: true, role: true }
    })
    const userByInsensitive = !user && await prisma.$queryRaw<{ id: string; email: string }[]>`
      SELECT id, email
      FROM users
      WHERE LOWER(TRIM(email)) = ${emailLower}
      LIMIT 1
    `.then(r => r[0]).catch(() => null)
    const userRes = user || (userByInsensitive ? { id: userByInsensitive.id, email: userByInsensitive.email, firstName: '', lastName: '', role: '' } : null)
    if (!attorney) {
      return res.json({
        email,
        attorney: null,
        user: userRes,
        message: 'Attorney not found with this email. Check spelling and that the attorney completed registration.'
      })
    }
    const [introCount, assignedCount, introAssessmentRows] = await Promise.all([
      prisma.introduction.count({ where: { attorneyId: attorney.id } }),
      prisma.leadSubmission.count({ where: { assignedAttorneyId: attorney.id } }),
      prisma.introduction.findMany({
        where: { attorneyId: attorney.id },
        select: { assessmentId: true },
        distinct: ['assessmentId']
      })
    ])
    const assessmentIds = introAssessmentRows.map((row) => row.assessmentId)
    const [introLeadCount, sampleLeads] = assessmentIds.length > 0
      ? await Promise.all([
          prisma.leadSubmission.count({
            where: { assessmentId: { in: assessmentIds } }
          }),
          prisma.leadSubmission.findMany({
            where: { assessmentId: { in: assessmentIds } },
            select: { id: true, assessmentId: true, assignedAttorneyId: true, status: true, submittedAt: true },
            orderBy: { submittedAt: 'desc' },
            take: 5
          })
        ])
      : [0, []]
    return res.json({
      email,
      attorney: { id: attorney.id, email: attorney.email, name: attorney.name },
      user: userRes,
      emailMatch: userRes ? (userRes.email?.trim().toLowerCase() === emailLower) : null,
      introCount,
      assignedCount,
      totalLeadsFromIntroPath: introLeadCount,
      sampleLeads,
      message: !userRes
        ? 'No User with this email. Attorney must log in with the same email used for routing.'
        : userRes.email?.trim().toLowerCase() !== emailLower
          ? `User email "${userRes.email}" does not exactly match attorney email "${attorney.email}". Dashboard lookup may fail.`
          : 'OK'
    })
  } catch (error: any) {
    logger.error('Attorney debug failed', { error: error.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Step 13: Run escalation for cases due for wave 2/3 (call from cron)
router.post('/cases/escalate-due', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const config = await getMatchingRules()
    if (config.routingEnabled === false) {
      return res.json({
        processed: 0,
        skipped: true,
        reason: 'Routing disabled by admin',
        results: []
      })
    }

    const now = new Date()
    const dueWaves = await prisma.routingWave.findMany({
      where: {
        nextEscalationAt: { lte: now, not: null },
        escalatedAt: null
      },
      select: { assessmentId: true, waveNumber: true, nextEscalationAt: true }
    })
    const overdueWaves = dueWaves.filter((wave) => {
      if (!wave.nextEscalationAt) return false
      const overdueHours = (now.getTime() - wave.nextEscalationAt.getTime()) / (1000 * 60 * 60)
      return overdueHours > Math.max(24, getConfiguredWaveWaitHours(config, wave.waveNumber) * 2)
    })
    const assessmentIds = [...new Set(dueWaves.map((wave) => wave.assessmentId))]
    const results = await Promise.all(
      assessmentIds.map(async (assessmentId) => {
        const result = await runEscalationWave(assessmentId)
        return { assessmentId, ...result }
      })
    )
    return res.json({
      processed: results.length,
      overdueCount: overdueWaves.length,
      overdueCases: overdueWaves.slice(0, 20).map((wave) => ({
        assessmentId: wave.assessmentId,
        waveNumber: wave.waveNumber,
        nextEscalationAt: wave.nextEscalationAt,
      })),
      results
    })
  } catch (error: any) {
    logger.error('Escalation error', { error: error.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Run routing engine on a single case (controlled matching: normalize → gate → rank → wave)
router.post('/cases/:id/route-engine', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id: caseId } = req.params
    const { maxAttorneysPerWave = 3, skipPreRoutingGate = false, dryRun = false } = req.body

    const result = await startAssessmentRouting(caseId, {
      maxAttorneysPerWave,
      skipPreRoutingGate,
      dryRun
    })

    await writeAdminAudit(req, {
      action: dryRun ? 'case_routing_simulated' : 'case_route_engine_executed',
      entityType: 'assessment',
      entityId: caseId,
      metadata: {
        maxAttorneysPerWave,
        skipPreRoutingGate,
        dryRun,
        success: result.success,
        gatePassed: result.gatePassed,
        gateReason: result.gateReason || null,
        gateStatus: result.gateStatus || null,
        strategy: result.strategy || 'classic',
        tierNumber: result.tierNumber ?? null,
        routedTo: result.routedTo || [],
        introductionIds: result.introductionIds || [],
        candidatesEligible: result.candidatesEligible ?? 0,
        candidatesQualified: result.candidatesQualified ?? 0,
        waveSize: result.waveSize ?? 0,
        diagnostics: result.diagnostics || null,
        errors: result.errors || [],
      },
    })

    return res.json(result)
  } catch (error: any) {
    logger.error('Routing engine error', { caseId: req.params.id, error: error.message })
    res.status(500).json({ success: false, errors: [error.message] })
  }
})

// Get scored attorney recommendations for a case
router.get('/cases/:caseId/recommendations', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { caseId } = req.params
    const { limit = 10 } = req.query
    const parsedLimit = Number.parseInt(String(limit), 10) || 10

    // Get assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        claimType: true,
        venueState: true,
        venueCounty: true,
        facts: true,
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { viability: true, bands: true }
        }
      }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    // Build case data
    const caseData: CaseForRouting = {
      id: assessment.id,
      claimType: assessment.claimType,
      venueState: assessment.venueState,
      venueCounty: assessment.venueCounty,
      facts: assessment.facts ? JSON.parse(assessment.facts) : undefined,
      prediction: assessment.predictions[0] ? {
        viability: JSON.parse(assessment.predictions[0].viability),
        bands: JSON.parse(assessment.predictions[0].bands)
      } : undefined
    }

    // Get all active attorneys with profiles
    const attorneys = await prisma.attorney.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        isVerified: true,
        specialties: true,
        responseTimeHours: true,
        averageRating: true,
        totalReviews: true,
        attorneyProfile: {
          select: {
            subscriptionTier: true,
            pricingModel: true,
            paymentModel: true,
            jurisdictions: true,
            excludedCaseTypes: true,
            minInjurySeverity: true,
            minDamagesRange: true,
            maxDamagesRange: true,
            maxCasesPerWeek: true,
            maxCasesPerMonth: true,
            successRate: true,
            averageSettlement: true,
            totalCases: true,
            yearsExperience: true
          }
        }
      }
    })
    const verifiedReviewCounts = await prisma.attorneyReview.groupBy({
      by: ['attorneyId'],
      where: {
        attorneyId: { in: attorneys.map((attorney) => attorney.id) },
        isVerified: true,
      },
      _count: {
        _all: true,
      },
    })
    const verifiedReviewCountMap = new Map(
      verifiedReviewCounts.map((entry) => [entry.attorneyId, entry._count._all])
    )
    const attorneyById = new Map(attorneys.map((attorney) => [attorney.id, attorney]))

    // Convert to AttorneyForRouting format
    const attorneysForRouting: AttorneyForRouting[] = attorneys.map(a => ({
      id: a.id,
      isActive: a.isActive,
      isVerified: a.isVerified,
      specialties: a.specialties,
      responseTimeHours: a.responseTimeHours,
      averageRating: a.averageRating,
      totalReviews: a.totalReviews,
      subscriptionTier: a.attorneyProfile?.subscriptionTier || null,
      pricingModel: a.attorneyProfile?.pricingModel || null,
      paymentModel: a.attorneyProfile?.paymentModel || null,
      attorneyProfile: a.attorneyProfile ? {
        jurisdictions: a.attorneyProfile.jurisdictions,
        excludedCaseTypes: a.attorneyProfile.excludedCaseTypes,
        minInjurySeverity: a.attorneyProfile.minInjurySeverity,
        minDamagesRange: a.attorneyProfile.minDamagesRange,
        maxDamagesRange: a.attorneyProfile.maxDamagesRange,
        maxCasesPerWeek: a.attorneyProfile.maxCasesPerWeek,
        maxCasesPerMonth: a.attorneyProfile.maxCasesPerMonth,
        successRate: a.attorneyProfile.successRate,
        averageSettlement: a.attorneyProfile.averageSettlement,
        totalCases: a.attorneyProfile.totalCases,
        yearsExperience: a.attorneyProfile.yearsExperience
      } : null
    }))

    // Complete routing pipeline: Step 0 → Step 1 → Step 2
    const routingResult = await routeCaseToAttorneys(attorneysForRouting, caseData)

    if (routingResult.qualified.length === 0) {
      return res.json({
        caseId,
        eligibleCount: routingResult.eligible.length,
        qualifiedCount: 0,
        recommendations: [],
        message: routingResult.eligible.length === 0 
          ? 'No eligible attorneys found for this case'
          : 'No attorneys passed quality gate for this case'
      })
    }

    // Use scored attorneys from routing pipeline
    const scored = routingResult.scored

    // Limit results
    const recommendations = scored.slice(0, parsedLimit)

    // Format response
    const formatted = recommendations.map((item, index) => ({
      rank: index + 1,
      attorney: {
        id: item.attorney.id,
        name: attorneyById.get(item.attorney.id)?.name,
        email: attorneyById.get(item.attorney.id)?.email,
        isVerified: attorneyById.get(item.attorney.id)?.isVerified,
        responseTimeHours: attorneyById.get(item.attorney.id)?.responseTimeHours,
        averageRating: attorneyById.get(item.attorney.id)?.averageRating,
        totalReviews: attorneyById.get(item.attorney.id)?.totalReviews,
        verifiedReviewCount: verifiedReviewCountMap.get(item.attorney.id) || 0,
        subscriptionTier: attorneyById.get(item.attorney.id)?.attorneyProfile?.subscriptionTier || null,
      },
      matchScore: {
        overall: Math.round(item.score.overall * 100) / 100,
        fitScore: Math.round(item.score.fitScore * 100) / 100,
        outcomeScore: Math.round(item.score.outcomeScore * 100) / 100,
        trustScore: Math.round(item.score.trustScore * 100) / 100,
        valueScore: Math.round(item.score.valueScore * 100) / 100
      },
      breakdown: item.score.breakdown
    }))

    res.json({
      caseId,
      eligibleCount: routingResult.eligible.length,
      qualifiedCount: routingResult.qualified.length,
      stats: routingResult.stats,
      recommendations: formatted
    })
  } catch (error) {
    logger.error('Failed to get attorney recommendations', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all attorneys for routing
// Optional: ?groupBy=firm to group attorneys under law firms
router.get('/attorneys', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { caseId, groupBy } = req.query // Optional: filter by case eligibility and grouping
    const groupByFirm = groupBy === 'firm'

    const attorneys = await prisma.attorney.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        specialties: true,
        venues: true,
        isVerified: true,
        responseTimeHours: true,
        averageRating: true,
        totalReviews: true,
        lawFirm: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true
          }
        },
        attorneyProfile: {
          select: {
            jurisdictions: true,
            excludedCaseTypes: true,
            minInjurySeverity: true,
            minDamagesRange: true,
            maxDamagesRange: true,
            maxCasesPerWeek: true,
            maxCasesPerMonth: true,
            subscriptionTier: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    const verifiedReviewCounts = await prisma.attorneyReview.groupBy({
      by: ['attorneyId'],
      where: {
        attorneyId: { in: attorneys.map((attorney) => attorney.id) },
        isVerified: true,
      },
      _count: {
        _all: true,
      },
    })
    const verifiedReviewCountMap = new Map(
      verifiedReviewCounts.map((entry) => [entry.attorneyId, entry._count._all])
    )

    let formattedAttorneys = attorneys.map(attorney => ({
      id: attorney.id,
      name: attorney.name,
      email: attorney.email,
      specialties: attorney.specialties ? JSON.parse(attorney.specialties) : [],
      venues: attorney.venues ? JSON.parse(attorney.venues) : [],
      isVerified: attorney.isVerified,
      responseTimeHours: attorney.responseTimeHours,
      averageRating: attorney.averageRating,
      totalReviews: attorney.totalReviews,
      verifiedReviewCount: verifiedReviewCountMap.get(attorney.id) || 0,
      lawFirm: attorney.lawFirm,
      subscriptionTier: attorney.attorneyProfile?.subscriptionTier || null,
      profile: attorney.attorneyProfile
    }))

    // If caseId provided, filter to only eligible attorneys
    if (caseId) {
      const assessment = await prisma.assessment.findUnique({
        where: { id: caseId as string },
        include: {
          predictions: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      })

      if (assessment) {
        const caseData: CaseForRouting = {
          id: assessment.id,
          claimType: assessment.claimType,
          venueState: assessment.venueState,
          venueCounty: assessment.venueCounty,
          facts: assessment.facts ? JSON.parse(assessment.facts) : undefined,
          prediction: assessment.predictions[0] ? {
            viability: JSON.parse(assessment.predictions[0].viability),
            bands: JSON.parse(assessment.predictions[0].bands)
          } : undefined
        }

      const attorneysForFiltering = attorneys.map(a => ({
          id: a.id,
          isActive: true,
        isVerified: a.isVerified,
        specialties: a.specialties,
        attorneyProfile: a.attorneyProfile
        }))

        const { eligible, ineligible } = await filterEligibleAttorneys(
          attorneysForFiltering,
          caseData
        )

        // Map back to formatted attorneys with eligibility info
        formattedAttorneys = formattedAttorneys.map(att => {
          const eligibleAttorney = eligible.find(e => e.id === att.id)
          const ineligibleInfo = ineligible.find(i => i.attorney.id === att.id)
          
          return {
            ...att,
            eligible: !!eligibleAttorney,
            ineligibilityReason: ineligibleInfo?.reason
          }
        })
      }
    }

    if (!groupByFirm) {
      return res.json({
        attorneys: formattedAttorneys
      })
    }

    // Group by firm
    const firmsMap = new Map<string, any>()

    for (const att of formattedAttorneys) {
      const key = att.lawFirm?.id || att.lawFirm?.name || 'Independent'
      if (!firmsMap.has(key)) {
        firmsMap.set(key, {
          firmId: att.lawFirm?.id || null,
          firmName: att.lawFirm?.name || 'Independent Attorney',
          slug: att.lawFirm?.slug || null,
          city: att.lawFirm?.city || null,
          state: att.lawFirm?.state || null,
          attorneys: [],
          attorneyCount: 0
        })
      }
      const firm = firmsMap.get(key)
      firm.attorneys.push(att)
      firm.attorneyCount += 1
    }

    const firms = Array.from(firmsMap.values()).sort((a, b) => a.firmName.localeCompare(b.firmName))

    res.json({
      firms,
      totalFirms: firms.length,
      totalAttorneys: formattedAttorneys.length
    })
  } catch (error) {
    logger.error('Failed to get attorneys', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/routing-feedback/summary', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const days = Math.min(180, Math.max(7, Number(req.query.days) || 30))
    const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))

    const [memories, analytics] = await Promise.all([
      prisma.decisionMemory.findMany({
        where: {
          OR: [
            { decisionAt: { gte: since } },
            { outcomeAt: { gte: since } },
            { createdAt: { gte: since } }
          ]
        },
        select: {
          recommendedDecision: true,
          attorneyDecision: true,
          override: true,
          outcomeStatus: true,
          recommendedConfidence: true,
        }
      }),
      prisma.routingAnalytics.findMany({
        where: { createdAt: { gte: since } },
        select: { eventType: true }
      })
    ])

    const outcomes: Record<string, number> = {}
    const recommendations: Record<string, number> = {}
    const attorneyDecisions: Record<string, number> = {}
    let overrides = 0
    let withOutcome = 0
    let confidenceSum = 0

    for (const memory of memories) {
      recommendations[memory.recommendedDecision] = (recommendations[memory.recommendedDecision] || 0) + 1
      if (memory.attorneyDecision) {
        attorneyDecisions[memory.attorneyDecision] = (attorneyDecisions[memory.attorneyDecision] || 0) + 1
      }
      if (memory.override) overrides += 1
      if (memory.outcomeStatus) {
        outcomes[memory.outcomeStatus] = (outcomes[memory.outcomeStatus] || 0) + 1
        withOutcome += 1
      }
      confidenceSum += memory.recommendedConfidence || 0
    }

    const analyticsByEvent: Record<string, number> = {}
    for (const row of analytics) {
      analyticsByEvent[row.eventType] = (analyticsByEvent[row.eventType] || 0) + 1
    }

    res.json({
      periodDays: days,
      totals: {
        decisionMemories: memories.length,
        outcomesRecorded: withOutcome,
        overrides,
        overrideRate: memories.length ? Number((overrides / memories.length).toFixed(4)) : 0,
        averageRecommendedConfidence: memories.length ? Number((confidenceSum / memories.length).toFixed(4)) : 0,
      },
      recommendations,
      attorneyDecisions,
      outcomes,
      analyticsByEvent,
    })
  } catch (error) {
    logger.error('Failed to get routing feedback summary', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/routing-feedback/candidates', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(250, Math.max(1, Number(req.query.limit) || 50))
    const overrideOnly = String(req.query.overrideOnly || 'false') === 'true'
    const outcomeStatus = typeof req.query.outcomeStatus === 'string' ? req.query.outcomeStatus : undefined
    const where: Record<string, unknown> = {}

    if (overrideOnly) where.override = true
    if (outcomeStatus) where.outcomeStatus = outcomeStatus

    const memories = await prisma.decisionMemory.findMany({
      where,
      take: limit,
      orderBy: [
        { outcomeAt: 'desc' },
        { decisionAt: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        attorney: { select: { id: true, name: true, email: true } },
        assessment: { select: { id: true, claimType: true, venueState: true, venueCounty: true } },
        lead: { select: { id: true, status: true, lifecycleState: true, viabilityScore: true } },
      }
    })

    res.json({
      candidates: memories.map((memory) => ({
        id: memory.id,
        leadId: memory.leadId,
        assessmentId: memory.assessmentId,
        attorney: memory.attorney,
        assessment: memory.assessment,
        lead: {
          ...memory.lead,
          score: memory.lead.viabilityScore,
        },
        recommendation: {
          decision: memory.recommendedDecision,
          confidence: memory.recommendedConfidence,
          rationale: memory.recommendedRationale,
          data: safeJsonParse(memory.recommendedData),
        },
        actualDecision: memory.attorneyDecision,
        attorneyRationale: memory.attorneyRationale,
        override: memory.override,
        outcomeStatus: memory.outcomeStatus,
        outcomeNotes: memory.outcomeNotes,
        decisionAt: memory.decisionAt,
        outcomeAt: memory.outcomeAt,
        createdAt: memory.createdAt,
      }))
    })
  } catch (error) {
    logger.error('Failed to get routing feedback candidates', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/routing-feedback/export', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200))
    const withOutcomeOnly = String(req.query.withOutcomeOnly || 'true') !== 'false'
    const where: Record<string, unknown> = withOutcomeOnly ? { outcomeStatus: { not: null } } : {}

    const memories = await prisma.decisionMemory.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        assessment: { select: { id: true, claimType: true, venueState: true, venueCounty: true, facts: true } },
        lead: { select: { id: true, status: true, lifecycleState: true, viabilityScore: true, sourceType: true } },
      }
    })

    const records = memories.map((memory) => ({
      leadId: memory.leadId,
      assessmentId: memory.assessmentId,
      claimType: memory.assessment.claimType,
      venueState: memory.assessment.venueState,
      venueCounty: memory.assessment.venueCounty,
      leadStatus: memory.lead.status,
      lifecycleState: memory.lead.lifecycleState,
      leadScore: memory.lead.viabilityScore,
      sourceType: memory.lead.sourceType,
      recommendedDecision: memory.recommendedDecision,
      recommendedConfidence: memory.recommendedConfidence,
      recommendedRationale: memory.recommendedRationale,
      recommendedData: safeJsonParse(memory.recommendedData),
      attorneyDecision: memory.attorneyDecision,
      attorneyRationale: memory.attorneyRationale,
      override: memory.override,
      outcomeStatus: memory.outcomeStatus,
      outcomeNotes: memory.outcomeNotes,
      caseFacts: safeJsonParse(memory.assessment.facts),
      decisionAt: memory.decisionAt,
      outcomeAt: memory.outcomeAt,
      updatedAt: memory.updatedAt,
    }))

    res.json({
      count: records.length,
      exportedAt: new Date().toISOString(),
      records
    })
  } catch (error) {
    logger.error('Failed to export routing feedback', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/routing-feedback/retraining-request', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      notes: z.string().min(5),
      filters: z.record(z.any()).optional(),
      sampleSize: z.number().int().min(1).max(500).optional(),
    })
    const parsed = schema.safeParse(req.body || {})
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const sampleSize = parsed.data.sampleSize || 50
    const where = buildDecisionMemoryWhere(parsed.data.filters)
    const samples = await prisma.decisionMemory.findMany({
      where,
      take: sampleSize,
      orderBy: [
        { outcomeAt: 'desc' },
        { decisionAt: 'desc' },
        { updatedAt: 'desc' }
      ],
      include: {
        assessment: { select: { id: true, claimType: true, venueState: true, venueCounty: true } },
        attorney: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, status: true, lifecycleState: true } }
      }
    })

    const sampleSummary = {
      count: samples.length,
      overrides: samples.filter((sample) => sample.override).length,
      withOutcome: samples.filter((sample) => !!sample.outcomeStatus).length,
      attorneyDecisions: Array.from(new Set(samples.map((sample) => sample.attorneyDecision).filter(Boolean))),
      recommendedDecisions: Array.from(new Set(samples.map((sample) => sample.recommendedDecision).filter(Boolean))),
    }

    const requestRecord = await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'routing_feedback_retraining_requested',
        entityType: 'decision_memory',
        entityId: null,
        statusCode: 202,
        metadata: JSON.stringify({
          notes: parsed.data.notes,
          filters: parsed.data.filters || null,
          sampleSize,
          sampleSummary,
          sampledDecisionMemoryIds: samples.map((sample) => sample.id),
          sampledAssessmentIds: samples.map((sample) => sample.assessmentId),
          sampledAttorneyIds: samples.map((sample) => sample.attorneyId),
          sampledRecords: samples.map((sample) => ({
            decisionMemoryId: sample.id,
            assessmentId: sample.assessmentId,
            leadId: sample.leadId,
            attorneyId: sample.attorneyId,
            attorneyDecision: sample.attorneyDecision,
            recommendedDecision: sample.recommendedDecision,
            outcomeStatus: sample.outcomeStatus,
            override: sample.override,
            claimType: sample.assessment.claimType,
            venueState: sample.assessment.venueState,
            venueCounty: sample.assessment.venueCounty,
            attorneyName: sample.attorney.name,
            leadStatus: sample.lead.status,
            lifecycleState: sample.lead.lifecycleState,
          })),
          requestedBy: req.user?.email || null,
        })
      }
    })

    await Promise.all(samples.map((sample) =>
      prisma.routingAnalytics.create({
        data: {
          assessmentId: sample.assessmentId,
          attorneyId: sample.attorneyId,
          eventType: 'feedback_retraining_requested',
          eventData: JSON.stringify({
            requestId: requestRecord.id,
            decisionMemoryId: sample.id,
            leadId: sample.leadId,
            notes: parsed.data.notes,
            filters: parsed.data.filters || null,
            requestedBy: req.user?.email || null,
          })
        }
      })
    ))

    res.status(202).json({
      success: true,
      requestId: requestRecord.id,
      sampledRecords: samples.length,
      message: 'Retraining request logged with a sampled decision-memory snapshot'
    })
  } catch (error) {
    logger.error('Failed to create routing retraining request', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

const AdminDocumentCorrectionSchema = z.object({
  category: z.string().optional(),
  subcategory: z.string().optional().nullable(),
  aiSummary: z.string().optional().nullable(),
  extractedData: z.object({
    icdCodes: z.array(z.string()).optional(),
    cptCodes: z.array(z.string()).optional(),
    dollarAmounts: z.array(z.string()).optional(),
    totalAmount: z.number().nullable().optional(),
    dates: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
    confidence: z.number().min(0).max(1).optional(),
  }).optional(),
})

router.get('/documents', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      status,
      category,
      assessmentId,
      query,
      limit = '80',
      offset = '0',
    } = req.query as Record<string, string | undefined>

    const where: any = {}
    if (status && status !== 'all') where.processingStatus = status
    if (category && category !== 'all') where.category = category
    if (assessmentId) where.assessmentId = assessmentId
    if (query) {
      where.OR = [
        { originalName: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { ocrText: { contains: query, mode: 'insensitive' } },
        { aiSummary: { contains: query, mode: 'insensitive' } },
        { assessmentId: { contains: query, mode: 'insensitive' } },
      ]
    }

    const take = Math.min(Math.max(Number(limit) || 80, 1), 200)
    const skip = Math.max(Number(offset) || 0, 0)

    const [files, total, statusCounts, categoryCounts] = await Promise.all([
      prisma.evidenceFile.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          assessment: { select: { id: true, claimType: true, venueState: true, venueCounty: true, status: true } },
          extractedData: { orderBy: { updatedAt: 'desc' }, take: 1 },
          processingJobs: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.evidenceFile.count({ where }),
      prisma.evidenceFile.groupBy({
        by: ['processingStatus'],
        _count: { _all: true },
      }),
      prisma.evidenceFile.groupBy({
        by: ['category'],
        _count: { _all: true },
      }),
    ])

    const documents = files.map(formatAdminDocument)
    const summary = {
      total,
      ingestion: documents.length,
      ocrPending: documents.filter((doc) => ['pending', 'processing'].includes(doc.ocrStatus)).length,
      extractionNeedsReview: documents.filter((doc) => doc.extractionStatus === 'needs_review').length,
      chronologyReady: documents.filter((doc) => doc.chronologyStatus === 'ready').length,
      billExtractionNeedsReview: documents.filter((doc) => doc.billExtractionStatus === 'needs_review').length,
      byStatus: Object.fromEntries(statusCounts.map((row) => [row.processingStatus, row._count._all])),
      byCategory: Object.fromEntries(categoryCounts.map((row) => [row.category, row._count._all])),
    }

    res.json({ documents, summary, total, limit: take, offset: skip })
  } catch (error) {
    logger.error('Failed to load admin documents', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/documents/:fileId/reprocess', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { fileId } = req.params
    const file = await prisma.evidenceFile.findUnique({
      where: { id: fileId },
      include: { extractedData: { orderBy: { updatedAt: 'desc' }, take: 1 } },
    })

    if (!file) {
      return res.status(404).json({ error: 'Document not found' })
    }

    const job = await prisma.evidenceProcessingJob.create({
      data: {
        evidenceFileId: fileId,
        jobType: 'admin_reprocess',
        status: 'running',
        startedAt: new Date(),
        priority: 9,
      },
    })

    const signals = extractDocumentSignals(file.ocrText || '')
    const aiSummary = file.ocrText
      ? file.ocrText.replace(/\s+/g, ' ').trim().slice(0, 500)
      : file.aiSummary || null

    const extractionData = {
      evidenceFileId: fileId,
      icdCodes: signals.icdCodes.length ? JSON.stringify(signals.icdCodes) : null,
      cptCodes: signals.cptCodes.length ? JSON.stringify(signals.cptCodes) : null,
      dollarAmounts: signals.dollarAmounts.length ? JSON.stringify(signals.dollarAmounts) : null,
      totalAmount: signals.totalAmount || null,
      dates: signals.dates.length ? JSON.stringify(signals.dates) : null,
      keywords: signals.keywords.length ? JSON.stringify(signals.keywords) : null,
      confidence: signals.confidence,
      isManualReview: signals.confidence < 0.5,
    }

    if (file.extractedData[0]) {
      await prisma.extractedData.update({
        where: { id: file.extractedData[0].id },
        data: extractionData,
      })
    } else {
      await prisma.extractedData.create({ data: extractionData })
    }

    await prisma.evidenceFile.update({
      where: { id: fileId },
      data: {
        processingStatus: 'completed',
        aiSummary,
      },
    })

    await prisma.evidenceProcessingJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        results: JSON.stringify({
          extractedDollarAmounts: signals.dollarAmounts.length,
          extractedDates: signals.dates.length,
          confidence: signals.confidence,
          source: 'admin_reprocess',
        }),
      },
    })

    await writeAdminAudit(req, {
      action: 'document_reprocessed',
      entityType: 'evidence_file',
      entityId: fileId,
      metadata: { assessmentId: file.assessmentId, jobId: job.id },
    })

    const refreshed = await prisma.evidenceFile.findUnique({
      where: { id: fileId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        assessment: { select: { id: true, claimType: true, venueState: true, venueCounty: true, status: true } },
        extractedData: { orderBy: { updatedAt: 'desc' }, take: 1 },
        processingJobs: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    })

    res.json({ ok: true, document: refreshed ? formatAdminDocument(refreshed) : null })
  } catch (error) {
    logger.error('Failed to reprocess admin document', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/documents/:fileId/extracted-data', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { fileId } = req.params
    const payload = AdminDocumentCorrectionSchema.parse(req.body || {})
    const file = await prisma.evidenceFile.findUnique({
      where: { id: fileId },
      include: { extractedData: { orderBy: { updatedAt: 'desc' }, take: 1 } },
    })

    if (!file) {
      return res.status(404).json({ error: 'Document not found' })
    }

    await prisma.evidenceFile.update({
      where: { id: fileId },
      data: {
        category: payload.category || undefined,
        subcategory: payload.subcategory === undefined ? undefined : payload.subcategory,
        aiSummary: payload.aiSummary === undefined ? undefined : payload.aiSummary,
        processingStatus: 'completed',
      },
    })

    if (payload.extractedData) {
      const data = {
        evidenceFileId: fileId,
        icdCodes: payload.extractedData.icdCodes ? JSON.stringify(payload.extractedData.icdCodes) : undefined,
        cptCodes: payload.extractedData.cptCodes ? JSON.stringify(payload.extractedData.cptCodes) : undefined,
        dollarAmounts: payload.extractedData.dollarAmounts ? JSON.stringify(payload.extractedData.dollarAmounts) : undefined,
        totalAmount: payload.extractedData.totalAmount === undefined ? undefined : payload.extractedData.totalAmount,
        dates: payload.extractedData.dates ? JSON.stringify(payload.extractedData.dates) : undefined,
        keywords: payload.extractedData.keywords ? JSON.stringify(payload.extractedData.keywords) : undefined,
        confidence: payload.extractedData.confidence ?? 0.95,
        isManualReview: false,
      }

      if (file.extractedData[0]) {
        await prisma.extractedData.update({
          where: { id: file.extractedData[0].id },
          data,
        })
      } else {
        await prisma.extractedData.create({ data })
      }
    }

    await writeAdminAudit(req, {
      action: 'document_extraction_corrected',
      entityType: 'evidence_file',
      entityId: fileId,
      metadata: { assessmentId: file.assessmentId },
    })

    const refreshed = await prisma.evidenceFile.findUnique({
      where: { id: fileId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        assessment: { select: { id: true, claimType: true, venueState: true, venueCounty: true, status: true } },
        extractedData: { orderBy: { updatedAt: 'desc' }, take: 1 },
        processingJobs: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    })

    res.json({ ok: true, document: refreshed ? formatAdminDocument(refreshed) : null })
  } catch (error: any) {
    logger.error('Failed to correct admin document extraction', { error })
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/documents/:fileId/approve-chronology', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { fileId } = req.params
    const file = await prisma.evidenceFile.findUnique({
      where: { id: fileId },
      include: { extractedData: { orderBy: { updatedAt: 'desc' }, take: 1 } },
    })

    if (!file) {
      return res.status(404).json({ error: 'Document not found' })
    }

    const dates = safeJsonArray(file.extractedData[0]?.dates)
    if (dates.length === 0) {
      return res.status(400).json({ error: 'No extracted dates are available for chronology approval' })
    }

    const job = await prisma.evidenceProcessingJob.create({
      data: {
        evidenceFileId: fileId,
        jobType: 'chronology_approval',
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        priority: 8,
        results: JSON.stringify({
          approvedDates: dates,
          approvedBy: req.user?.email || null,
        }),
      },
    })

    await prisma.extractedData.update({
      where: { id: file.extractedData[0].id },
      data: { isManualReview: false },
    })

    await writeAdminAudit(req, {
      action: 'document_chronology_approved',
      entityType: 'evidence_file',
      entityId: fileId,
      metadata: { assessmentId: file.assessmentId, jobId: job.id, approvedDates: dates.length },
    })

    const refreshed = await prisma.evidenceFile.findUnique({
      where: { id: fileId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        assessment: { select: { id: true, claimType: true, venueState: true, venueCounty: true, status: true } },
        extractedData: { orderBy: { updatedAt: 'desc' }, take: 1 },
        processingJobs: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    })

    res.json({ ok: true, document: refreshed ? formatAdminDocument(refreshed) : null })
  } catch (error) {
    logger.error('Failed to approve admin document chronology', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
