import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { adminMiddleware } from '../lib/admin-access'
import { writeAdminAudit } from '../lib/admin-audit'
import { safeJsonParse } from './admin-shared'

const router: ExpressRouter = Router()

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
      intakeOpenLeads,
      intakeCompletedLeads,
      intakeAbandonedReengaged,
      intakeProvisionalAccounts,
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
      prisma.intakeLead.count({ where: { status: 'in_progress' } }),
      prisma.intakeLead.count({ where: { status: 'completed' } }),
      prisma.intakeLead.count({ where: { abandonmentEmailedAt: { not: null } } }),
      prisma.user.count({ where: { provider: 'intake', passwordHash: null } }),
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
      intake: {
        openLeads: intakeOpenLeads,
        completedLeads: intakeCompletedLeads,
        abandonedReengaged: intakeAbandonedReengaged,
        provisionalAccounts: intakeProvisionalAccounts,
      },
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
export default router
