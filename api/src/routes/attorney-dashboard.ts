import { Router } from 'express'
import archiver from 'archiver'
import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../lib/auth'
import { logger } from '../lib/logger'
import { runAnalysisForAssessment } from './evidence'
import { runCaseRecalculation } from '../lib/case-recalculation'
import { analyzeCaseWithChatGPT, CaseAnalysisRequest } from '../services/chatgpt'
import { z } from 'zod'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import PDFDocument from 'pdfkit'
import crypto from 'crypto'
import { calculateSOL, getSOLStatus } from '../lib/solRules'
import { buildMedicalChronology, buildMedicalChronologySummary, computeCasePreparation, getSettlementBenchmarks } from '../lib/case-insights'
import { recordCaseOutcome } from '../lib/case-outcomes'
import {
  calculateAttorneyReputationScore,
  recordRoutingEvent,
  syncDecisionMemoryForAssessment
} from '../lib/routing-lifecycle'
import { sendPlaintiffAttorneyAccepted } from '../lib/case-notifications'
import { createExternalCalendarEvent } from '../lib/calendar-sync'
import { deliverDirectNotification } from '../lib/platform-notifications'
import { translateToEnglish, looksNonEnglish } from '../lib/translate'
import { isValidPhone, normalizePhone, PHONE_ERROR_MESSAGE } from '../lib/phone'
import { answerCommandCenterCopilot, buildCaseAwareMessageTemplates, buildCaseCommandCenter } from '../lib/case-command-center'
import { buildAttorneyWorkQueue } from '../lib/attorney-work-queue'
import { buildReadinessAutomationPlan } from '../lib/readiness-automation'
import { exportCaseToConnectionSafe } from '../lib/cms'
import {
  formatAttorneyResponseDeadline,
  getAttorneyResponseDeadlineMinutes,
  getCaseRoutingPricingForClaimType,
  getMatchingRules,
} from '../lib/matching-rules-config'

const router = Router()
const PROJECTED_CONTINGENCY_RATE = 0.33
const PROJECTED_PLATFORM_FEE_RATE = 0.1

async function fetchAttorneyForDashboard(attorneyId: string) {
  try {
    return await prisma.attorney.findUnique({
      where: { id: attorneyId },
      include: {
        attorneyProfile: true
      }
    })
  } catch (error: any) {
    logger.warn('Attorney profile fetch failed; falling back to attorney row only', {
      attorneyId,
      error: error?.message,
      errorCode: error?.code,
    })
    return prisma.attorney.findUnique({
      where: { id: attorneyId },
    })
  }
}

async function buildRevenueProjection(assessmentId: string) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      predictions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { bands: true }
      }
    }
  })

  const bandsRaw = assessment?.predictions?.[0]?.bands
  if (!bandsRaw) return null

  try {
    const bands = JSON.parse(bandsRaw) as { median?: number }
    const caseMedianValue = Number(bands.median || 0)
    if (!caseMedianValue) return null

    return {
      caseMedianValue,
      projectedFeeRevenue: Math.round(caseMedianValue * PROJECTED_CONTINGENCY_RATE * PROJECTED_PLATFORM_FEE_RATE)
    }
  } catch {
    return null
  }
}

/** Attorney uploads to an assigned lead — files attach to plaintiff assessment (same store as GET .../evidence). */
const leadAttorneyEvidenceMulter = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'evidence')
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
      cb(null, uploadDir)
    },
    filename: (_req, file, cb) => {
      cb(null, `${uuidv4()}-${file.originalname}`)
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('File type not allowed'))
  },
})

const intakeImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'text/csv',
      'text/tab-separated-values',
      'text/plain',
      'application/json',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]
    const extension = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(file.mimetype) || ['.csv', '.tsv', '.txt', '.json', '.xls', '.xlsx'].includes(extension)) {
      cb(null, true)
      return
    }
    cb(new Error('Import files must be CSV, TSV, JSON, XLS, or XLSX exports'))
  },
})

async function getAttorneyFromReq(req: any) {
  if (!req.user?.email) {
    return { error: { status: 401, message: 'Authentication required' } }
  }

  const attorney = await prisma.attorney.findFirst({
    where: { email: req.user.email }
  })

  if (!attorney) {
    return { error: { status: 403, message: 'Attorney profile not found' } }
  }

  return { attorney }
}

async function getAuthorizedLead(req: any, leadId: string) {
  if (!req.user?.email) {
    return { error: { status: 401, message: 'Authentication required' } }
  }

  const attorney = await prisma.attorney.findFirst({
    where: { email: req.user.email }
  })

  if (!attorney) {
    return { error: { status: 403, message: 'Attorney profile not found' } }
  }

  const lead = await prisma.leadSubmission.findUnique({
    where: { id: leadId }
  })

  if (!lead) {
    return { error: { status: 404, message: 'Lead not found' } }
  }

  const isShared = lead.assignmentType === 'shared'
  const isAssigned = lead.assignedAttorneyId === attorney.id
  const intro = await prisma.introduction.findFirst({
    where: {
      assessmentId: lead.assessmentId,
      attorneyId: attorney.id
    }
  })
  const ethicalWall = await prisma.ethicalWall.findFirst({
    where: {
      assessmentId: lead.assessmentId,
      blockedAttorneyId: attorney.id
    }
  })
  const assignedAttorney = lead.assignedAttorneyId
    ? await prisma.attorney.findUnique({
        where: { id: lead.assignedAttorneyId },
        select: { lawFirmId: true }
      })
    : null
  const sameFirm =
    attorney.lawFirmId &&
    assignedAttorney?.lawFirmId &&
    attorney.lawFirmId === assignedAttorney.lawFirmId
  const acceptedShare = await prisma.caseShare.findFirst({
    where: {
      assessmentId: lead.assessmentId,
      status: 'accepted',
      OR: [
        { sharedWithAttorneyId: attorney.id },
        { sharedWithEmail: attorney.email || undefined }
      ]
    }
  })

  if (ethicalWall) {
    return { error: { status: 403, message: 'Access restricted by ethical wall' } }
  }

  if (!isShared && !isAssigned && !intro && !sameFirm && !acceptedShare) {
    return { error: { status: 403, message: 'Not authorized to view this lead' } }
  }

  return { attorney, lead }
}

async function computeCaseHealth(leadId: string, assessmentId: string, attorneyId?: string) {
  const now = new Date()
  let score = 100
  const factors: Array<{ key: string; detail: string }> = []
  const alerts: Array<{ type: string; severity: 'warning' | 'critical'; message: string }> = []

  const [
    leadSubmission,
    evidenceFiles,
    appointments,
    insuranceDetails,
    invoices,
    openTasks,
    negotiationEvents,
    openLiens,
    latestContact,
  ] = await Promise.all([
    prisma.leadSubmission.findUnique({
      where: { id: leadId },
      select: {
        liabilityScore: true,
        viabilityScore: true,
        causationScore: true,
        damagesScore: true,
        evidenceChecklist: true,
        submittedAt: true
      }
    }),
    prisma.evidenceFile.findMany({
      where: { assessmentId },
      select: { category: true, createdAt: true }
    }),
    prisma.appointment.findMany({
      where: { assessmentId },
      select: { status: true, scheduledAt: true }
    }),
    prisma.insuranceDetail.findMany({
      where: { assessmentId },
      select: { policyLimit: true }
    }),
    prisma.billingInvoice.findMany({
      where: { assessmentId },
      select: { amount: true, status: true, dueDate: true, createdAt: true }
    }),
    prisma.caseTask.findMany({
      where: { assessmentId, status: 'open', dueDate: { not: null } },
      select: { dueDate: true, taskType: true, title: true }
    }),
    prisma.negotiationEvent.findMany({
      where: { assessmentId },
      orderBy: { eventDate: 'asc' },
      select: { eventType: true, amount: true, eventDate: true, status: true, concessionValue: true }
    }),
    prisma.lienHolder.count({
      where: { assessmentId, status: { not: 'resolved' } }
    }),
    prisma.leadContact.findFirst({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    })
  ])

  const overdueTasks = openTasks.filter((task) => task.dueDate && task.dueDate.getTime() < now.getTime()).length
  if (overdueTasks > 0) {
    const penalty = Math.min(30, overdueTasks * 10)
    score -= penalty
    factors.push({ key: 'overdue_tasks', detail: `${overdueTasks} overdue tasks` })
    alerts.push({ type: 'deadline_risk', severity: 'critical', message: `${overdueTasks} overdue tasks` })
  }

  if (openLiens > 0) {
    const penalty = Math.min(20, openLiens * 5)
    score -= penalty
    factors.push({ key: 'open_liens', detail: `${openLiens} open liens` })
  }

  const latestNegotiation = negotiationEvents.length > 0 ? negotiationEvents[negotiationEvents.length - 1] : null
  if (!latestNegotiation) {
    score -= 10
    factors.push({ key: 'negotiation_stale', detail: 'No negotiation events logged' })
    alerts.push({ type: 'stalled_case', severity: 'warning', message: 'No negotiation events logged' })
  } else {
    const days = Math.floor((now.getTime() - new Date(latestNegotiation.eventDate).getTime()) / 86400000)
    if (days > 30) {
      score -= 10
      factors.push({ key: 'negotiation_stale', detail: `No negotiation in ${days} days` })
      alerts.push({ type: 'stalled_case', severity: 'warning', message: `No negotiation in ${days} days` })
    }
  }

  if (!latestContact) {
    score -= 10
    factors.push({ key: 'contact_gap', detail: 'No contact attempts logged' })
    alerts.push({ type: 'stalled_case', severity: 'warning', message: 'No contact attempts logged' })
  } else {
    const days = Math.floor((now.getTime() - new Date(latestContact.createdAt).getTime()) / 86400000)
    if (days > 14) {
      score -= 10
      factors.push({ key: 'contact_gap', detail: `No contact in ${days} days` })
      if (days > 30) {
        alerts.push({ type: 'stalled_case', severity: 'warning', message: `No contact in ${days} days` })
      }
    }
  }

  const liabilityScores = [
    leadSubmission?.liabilityScore,
    leadSubmission?.viabilityScore,
    leadSubmission?.causationScore,
    leadSubmission?.damagesScore
  ].filter((value) => typeof value === 'number') as number[]
  const liabilityStrength = liabilityScores.length
    ? Math.round(liabilityScores.reduce((sum, value) => sum + value, 0) / liabilityScores.length)
    : 50
  if (liabilityStrength < 60) {
    factors.push({ key: 'liability_strength', detail: 'Liability strength is below target' })
  }

  const requiredCategories = ['medical_records', 'police_report', 'bills', 'photos']
  const categoriesPresent = new Set(evidenceFiles.map((file) => file.category))
  let checklistTotal = 0
  let checklistMissing = 0
  if (leadSubmission?.evidenceChecklist) {
    try {
      const parsed = JSON.parse(leadSubmission.evidenceChecklist)
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          checklistTotal += 1
          const status = String(item?.status || item?.state || '').toLowerCase()
          const completed = item?.completed === true || item?.present === true
          if (!completed && (status === 'missing' || status === 'needed' || status === 'incomplete' || status === '')) {
            checklistMissing += 1
          }
        })
      }
    } catch (err) {
      checklistTotal = 0
      checklistMissing = 0
    }
  }
  const evidenceCompleteness = checklistTotal > 0
    ? Math.round(((checklistTotal - checklistMissing) / checklistTotal) * 100)
    : Math.round((requiredCategories.filter((category) => categoriesPresent.has(category)).length / requiredCategories.length) * 100)
  if (evidenceCompleteness < 70) {
    factors.push({ key: 'evidence_completeness', detail: 'Evidence completeness below target' })
    alerts.push({ type: 'evidence_gaps', severity: 'warning', message: 'Evidence gaps detected' })
  }

  const medicalEvidenceCount = evidenceFiles.filter((file) => file.category === 'medical_records' || file.category === 'bills').length
  const completedAppointments = appointments.filter((item) => item.status === 'COMPLETED').length
  const medicalTreatment = medicalEvidenceCount > 0 && completedAppointments > 0
    ? 90
    : medicalEvidenceCount > 0
      ? 70
      : completedAppointments > 0
        ? 60
        : 40
  if (medicalTreatment < 60) {
    factors.push({ key: 'medical_treatment', detail: 'Medical treatment documentation is thin' })
    alerts.push({ type: 'evidence_gaps', severity: 'warning', message: 'Medical treatment records missing' })
  }

  const policyLimit = insuranceDetails.reduce((max, item) => Math.max(max, item.policyLimit || 0), 0)
  const latestDemand = negotiationEvents.filter((event) => event.eventType === 'demand').slice(-1)[0]?.amount || null
  const latestOffer = negotiationEvents.filter((event) => event.eventType === 'offer').slice(-1)[0]?.amount || null
  let insuranceConstraints = 100
  if (!insuranceDetails.length) {
    insuranceConstraints = 60
    factors.push({ key: 'insurance_constraints', detail: 'Insurance coverage not documented' })
  } else if (policyLimit && latestDemand && latestDemand > policyLimit) {
    insuranceConstraints = latestDemand > policyLimit * 1.2 ? 40 : 55
    factors.push({ key: 'insurance_constraints', detail: 'Demand exceeds policy limits' })
    alerts.push({ type: 'value_leakage', severity: 'warning', message: 'Demand exceeds policy limits' })
  }

  let timeRisk = 100
  const nextDueDate = openTasks
    .map((task) => task.dueDate)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime())[0]
  if (nextDueDate) {
    const daysUntil = Math.floor((nextDueDate.getTime() - now.getTime()) / 86400000)
    if (daysUntil < 0) {
      timeRisk = 40
      alerts.push({ type: 'deadline_risk', severity: 'critical', message: 'Deadlines are overdue' })
    } else if (daysUntil <= 7) {
      timeRisk = 60
      alerts.push({ type: 'deadline_risk', severity: 'warning', message: 'Upcoming deadlines within 7 days' })
    } else if (daysUntil <= 30) {
      timeRisk = 80
    }
  }

  const invoiceTotal = invoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0)
  const costBasis = policyLimit || latestOffer || latestDemand || 1
  const costRatio = invoiceTotal / costBasis
  let costBurn = 95
  if (invoiceTotal > 0) {
    if (costRatio > 0.6) {
      costBurn = 40
    } else if (costRatio > 0.4) {
      costBurn = 55
    } else if (costRatio > 0.25) {
      costBurn = 70
    } else {
      costBurn = 85
    }
  }
  if (costRatio > 0.4) {
    alerts.push({ type: 'over_investment', severity: 'warning', message: 'Cost burn is high versus expected recovery' })
    factors.push({ key: 'cost_burn', detail: 'Cost burn is high versus expected recovery' })
  }

  const totalConcessions = negotiationEvents
    .filter((event) => Number(event.concessionValue))
    .reduce((sum, event) => sum + Number(event.concessionValue || 0), 0)
  if (latestDemand && latestOffer) {
    const gap = latestDemand - latestOffer
    if (gap > latestDemand * 0.25) {
      alerts.push({ type: 'value_leakage', severity: 'warning', message: 'Demand-offer gap remains wide' })
    }
  }
  if (latestDemand && totalConcessions > latestDemand * 0.15) {
    alerts.push({ type: 'value_leakage', severity: 'warning', message: 'Concessions are eroding case value' })
  }

  const components = {
    liabilityStrength,
    evidenceCompleteness,
    medicalTreatment,
    insuranceConstraints,
    timeRisk,
    costBurn
  }

  const baseScore = Math.round(
    Object.values(components).reduce((sum, value) => sum + value, 0) / Object.values(components).length
  )
  const alertPenalty = alerts.reduce((sum, alert) => sum + (alert.severity === 'critical' ? 10 : 5), 0)
  score = Math.max(0, Math.min(100, baseScore - alertPenalty))
  const level = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red'

  let escalations: Array<{ threshold: number; action: string }> = []
  if (attorneyId) {
    const rules = await prisma.healthEscalationRule.findMany({
      where: { attorneyId },
      orderBy: { threshold: 'asc' },
      select: { threshold: true, action: true }
    })
    escalations = rules
      .filter(rule => score <= rule.threshold)
      .map(rule => ({ threshold: rule.threshold, action: rule.action }))
  }

  return { score, level, factors, escalations, alerts, components }
}

function buildDecisionRecommendation(
  lead: any,
  evidenceCount: number,
  profile?: { riskTolerance?: string | null; negotiationStyle?: string | null }
) {
  const viability = Number(lead.viabilityScore || 0)
  const liability = Number(lead.liabilityScore || 0)
  const causation = Number(lead.causationScore || 0)
  const damages = Number(lead.damagesScore || 0)
  const averageScore = (viability + liability + causation + damages) / 4
  const evidenceScore = Math.min(1, evidenceCount / 5)
  const baseScore = averageScore * 0.7 + evidenceScore * 0.3

  let threshold = 0.6
  if (profile?.riskTolerance === 'high') {
    threshold = 0.5
  } else if (profile?.riskTolerance === 'low') {
    threshold = 0.7
  }

  const confidence = Math.round(baseScore * 100)

  const recommendedDecision = averageScore >= threshold && evidenceScore >= 0.4 ? 'accept' : 'reject'
  const evidenceLabel = evidenceCount >= 5 ? 'strong' : evidenceCount >= 2 ? 'moderate' : 'thin'
  const styleNote = profile?.negotiationStyle ? ` Style: ${profile.negotiationStyle}.` : ''
  const riskNote = profile?.riskTolerance ? ` Risk tolerance: ${profile.riskTolerance}.` : ''
  const rationale = `Scores avg ${(averageScore * 100).toFixed(0)}% with ${evidenceLabel} evidence (${evidenceCount} files).${styleNote}${riskNote}`

  return {
    recommendedDecision,
    recommendedConfidence: confidence,
    recommendedRationale: rationale,
    recommendedData: JSON.stringify({
      viability,
      liability,
      causation,
      damages,
      averageScore,
      threshold,
      evidenceCount,
      evidenceScore
    })
  }
}

const attorneyDecisionProfileSelect = {
  id: true,
  attorneyId: true,
  lawFirmId: true,
  negotiationStyle: true,
  riskTolerance: true,
  preferences: true,
  createdAt: true,
  updatedAt: true,
} as const

const decisionMemorySelect = {
  id: true,
  leadId: true,
  assessmentId: true,
  attorneyId: true,
  lawFirmId: true,
  recommendedDecision: true,
  recommendedConfidence: true,
  recommendedRationale: true,
  recommendedData: true,
  attorneyDecision: true,
  attorneyRationale: true,
  override: true,
  decisionAt: true,
  outcomeStatus: true,
  outcomeNotes: true,
  outcomeAt: true,
  retained: true,
  settlementAmount: true,
  wentToTrial: true,
  attorneySatisfaction: true,
  attorneySatisfactionNotes: true,
  plaintiffSatisfaction: true,
  plaintiffSatisfactionNotes: true,
  plaintiffSatisfactionAt: true,
  createdAt: true,
  updatedAt: true,
} as const

const attorneyIdentitySelect = {
  id: true,
  lawFirmId: true,
} as const

const attorneyDecisionBenchmarkHistorySelect = {
  attorneyDecision: true,
  outcomeStatus: true,
} as const

const firmDecisionBenchmarkHistorySelect = {
  attorneyDecision: true,
  outcomeStatus: true,
  attorneyRationale: true,
} as const

const decisionSummaryHistorySelect = {
  attorneyDecision: true,
  outcomeStatus: true,
  override: true,
  recommendedConfidence: true,
  attorneyRationale: true,
} as const

const negotiationEventSelect = {
  id: true,
  assessmentId: true,
  eventType: true,
  amount: true,
  eventDate: true,
  status: true,
  notes: true,
  counterpartyType: true,
  insurerName: true,
  adjusterName: true,
  adjusterEmail: true,
  adjusterPhone: true,
  concessionValue: true,
  concessionNotes: true,
  acceptanceRationale: true,
  createdAt: true,
  updatedAt: true,
} as const

const negotiationInsightEventSelect = {
  eventType: true,
  amount: true,
  eventDate: true,
  status: true,
  insurerName: true,
  adjusterName: true,
  concessionValue: true,
} as const

const caseNoteSelect = {
  id: true,
  assessmentId: true,
  authorId: true,
  authorName: true,
  authorEmail: true,
  noteType: true,
  message: true,
  createdAt: true,
  updatedAt: true,
} as const

const caseCommentSelect = {
  id: true,
  threadId: true,
  authorId: true,
  authorName: true,
  authorEmail: true,
  message: true,
  mentions: true,
  createdAt: true,
  updatedAt: true,
} as const

const caseCommentThreadSelect = {
  id: true,
  assessmentId: true,
  title: true,
  threadType: true,
  allowedRoles: true,
  summary: true,
  createdById: true,
  createdByName: true,
  createdByEmail: true,
  lastCommentAt: true,
  createdAt: true,
  updatedAt: true,
} as const

const caseCommentThreadAccessSelect = {
  id: true,
  assessmentId: true,
  allowedRoles: true,
} as const

const insuranceDetailSelect = {
  id: true,
  assessmentId: true,
  carrierName: true,
  policyNumber: true,
  policyLimit: true,
  adjusterName: true,
  adjusterEmail: true,
  adjusterPhone: true,
  notes: true,
  insuredParty: true,
  coverageType: true,
  claimNumber: true,
  claimStatus: true,
  claimOpenedAt: true,
  decPageRequestId: true,
  coverageConfirmed: true,
  createdAt: true,
  updatedAt: true,
} as const

const INSURED_PARTIES = ['defendant', 'client'] as const
const COVERAGE_TYPES = ['liability', 'um', 'uim', 'medpay', 'other'] as const
const CLAIM_STATUSES = ['not_opened', 'open', 'accepted', 'denied', 'closed'] as const

function normalizeEnum<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): T[number] | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T[number])
    : null
}

// Derive a suggested insurance record + claim-type (at-fault vs UM/UIM) from the
// plaintiff's intake answers, so the attorney's insurance form starts pre-filled
// rather than re-keying what the client already reported. The attorney still
// reviews and decides — this only proposes.
function buildInsuranceClaimSuggestion(facts: any) {
  const ins = (facts && typeof facts === 'object' ? facts.insurance : null) || {}
  const liability = (facts && typeof facts === 'object' ? facts.liability : null) || {}

  const otherPartyInsured: string | null = ins.other_party_insured ?? null
  const defendantPolicyLimit: number | null =
    typeof ins.policy_limit === 'number' ? ins.policy_limit : null
  const hasUmUim = Boolean(ins.has_um_uim_coverage)
  const hasPip = Boolean(ins.has_pip_coverage)
  const hasMedPay = Boolean(ins.has_med_pay_coverage)
  const plaintiffCarrier: string | null = ins.plaintiff_auto_carrier || null
  const faultBelief: string | null = liability.faultBelief ?? null

  const warnings: string[] = []
  let suggestion: {
    carrierName?: string
    policyLimit?: number
    insuredParty?: 'defendant' | 'client'
    coverageType?: 'liability' | 'um' | 'uim'
  } = {}
  let claimTypeLabel = 'Undetermined'
  let rationale = 'Confirm whether the at-fault party is insured to determine an at-fault vs UM claim.'
  let available = false

  if (otherPartyInsured === 'no') {
    available = true
    claimTypeLabel = "UM claim (client's own policy)"
    rationale = 'Intake indicates the at-fault party is uninsured, so recovery goes against the client’s own uninsured-motorist (UM) coverage.'
    suggestion = {
      insuredParty: 'client',
      coverageType: 'um',
      ...(plaintiffCarrier ? { carrierName: plaintiffCarrier } : {}),
    }
    if (!hasUmUim) {
      warnings.push('Client reported no UM/UIM coverage — recovery may be limited. Confirm the policy.')
    }
  } else if (otherPartyInsured === 'yes') {
    available = true
    claimTypeLabel = 'At-fault claim (defendant’s insurer)'
    rationale = 'Intake indicates the at-fault party is insured; pursue the liability claim against their carrier.'
    suggestion = {
      insuredParty: 'defendant',
      coverageType: 'liability',
      ...(defendantPolicyLimit ? { policyLimit: defendantPolicyLimit } : {}),
    }
    if (hasUmUim && defendantPolicyLimit && defendantPolicyLimit <= 25000) {
      warnings.push('Defendant limits look low and the client has UM/UIM — consider a UIM claim if liability limits are insufficient.')
    }
  } else if (otherPartyInsured === 'not_sure') {
    rationale = 'Client is unsure whether the at-fault party is insured — request the Dec Page to confirm coverage before classifying the claim.'
  }

  return {
    available,
    claimTypeLabel,
    rationale,
    warnings,
    suggestion,
    intake: { otherPartyInsured, defendantPolicyLimit, hasUmUim, hasPip, hasMedPay, plaintiffCarrier, faultBelief },
  }
}

const lienHolderSelect = {
  id: true,
  assessmentId: true,
  name: true,
  type: true,
  amount: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const

const caseTaskSelect = {
  id: true,
  assessmentId: true,
  title: true,
  taskType: true,
  milestoneType: true,
  checkpointType: true,
  deadlineType: true,
  dueDate: true,
  reminderAt: true,
  escalationLevel: true,
  assignedRole: true,
  assignedTo: true,
  status: true,
  priority: true,
  notes: true,
  sourceTemplateId: true,
  sourceTemplateStepId: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
} as const

const billingInvoiceSelect = {
  id: true,
  assessmentId: true,
  invoiceNumber: true,
  amount: true,
  status: true,
  dueDate: true,
  paidAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const

const billingPaymentSelect = {
  id: true,
  assessmentId: true,
  amount: true,
  method: true,
  receivedAt: true,
  reference: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const

const analyticsLeadSelect = {
  id: true,
  assessmentId: true,
  assignedAttorneyId: true,
  status: true,
  submittedAt: true,
  convertedAt: true,
  assessment: {
    select: {
      claimType: true,
      venueState: true,
    }
  }
} as const

const analyticsInvoiceSelect = {
  assessmentId: true,
  amount: true,
} as const

const analyticsPaymentSelect = {
  assessmentId: true,
  amount: true,
} as const

const analyticsNegotiationSelect = {
  assessmentId: true,
  eventType: true,
  status: true,
  amount: true,
} as const

const analyticsInsuranceSelect = {
  assessmentId: true,
  carrierName: true,
  adjusterName: true,
} as const

const analyticsForecastSelect = {
  totalFees: true,
  platformSpend: true,
} as const

const chatMessageSelect = {
  id: true,
  chatRoomId: true,
  senderId: true,
  senderType: true,
  content: true,
  messageType: true,
  metadata: true,
  isRead: true,
  readAt: true,
  createdAt: true,
} as const

const chatMessagePreviewSelect = {
  content: true,
  senderType: true,
  createdAt: true,
} as const

const chatRoomOwnershipSelect = {
  id: true,
} as const

const chatRoomSummarySelect = {
  id: true,
  assessmentId: true,
  lastMessageAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    }
  },
  assessment: {
    select: {
      id: true,
      claimType: true,
      venueState: true,
    }
  },
  messages: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: chatMessagePreviewSelect
  }
} as const

const chatRoomDetailSelect = {
  id: true,
  lastMessageAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    }
  },
  assessment: {
    select: {
      id: true,
      claimType: true,
      venueState: true,
    }
  },
  messages: {
    orderBy: { createdAt: 'desc' as const },
    take: 20,
    select: chatMessageSelect
  }
} as const

function buildFirmPatterns(history: Array<{ attorneyDecision: string | null; outcomeStatus: string | null; attorneyRationale: string | null }>) {
  const successOutcomes = new Set(['retained', 'settled', 'won'])
  const acceptCases = history.filter(item => item.attorneyDecision === 'accept')
  const rejectCases = history.filter(item => item.attorneyDecision === 'reject')
  const acceptSuccess = acceptCases.filter(item => item.outcomeStatus && successOutcomes.has(item.outcomeStatus)).length
  const rejectSuccess = rejectCases.filter(item => item.outcomeStatus && successOutcomes.has(item.outcomeStatus)).length

  const topRationales = history
    .map(item => item.attorneyRationale)
    .filter((item): item is string => Boolean(item && item.length > 0))
    .slice(0, 3)

  return {
    totalDecisions: history.length,
    acceptSuccessRate: acceptCases.length ? Math.round((acceptSuccess / acceptCases.length) * 100) : 0,
    rejectSuccessRate: rejectCases.length ? Math.round((rejectSuccess / rejectCases.length) * 100) : 0,
    recentRationales: topRationales
  }
}

function buildAttorneyPatterns(history: Array<{ attorneyDecision: string | null; outcomeStatus: string | null }>) {
  const successOutcomes = new Set(['retained', 'settled', 'won'])
  const acceptCases = history.filter(item => item.attorneyDecision === 'accept')
  const rejectCases = history.filter(item => item.attorneyDecision === 'reject')
  const acceptSuccess = acceptCases.filter(item => item.outcomeStatus && successOutcomes.has(item.outcomeStatus)).length
  const rejectSuccess = rejectCases.filter(item => item.outcomeStatus && successOutcomes.has(item.outcomeStatus)).length

  return {
    totalDecisions: history.length,
    acceptSuccessRate: acceptCases.length ? Math.round((acceptSuccess / acceptCases.length) * 100) : 0,
    rejectSuccessRate: rejectCases.length ? Math.round((rejectSuccess / rejectCases.length) * 100) : 0
  }
}

function buildDecisionSummary(history: Array<{
  attorneyDecision: string | null
  outcomeStatus: string | null
  override: boolean | null
  recommendedConfidence: number | null
  attorneyRationale: string | null
}>) {
  const total = history.length
  const acceptCount = history.filter(item => item.attorneyDecision === 'accept').length
  const rejectCount = history.filter(item => item.attorneyDecision === 'reject').length
  const overrideCount = history.filter(item => item.override).length
  const avgConfidence = total
    ? Math.round(history.reduce((sum, item) => sum + (item.recommendedConfidence || 0), 0) / total)
    : 0
  const topRationales = history
    .map(item => item.attorneyRationale)
    .filter((item): item is string => Boolean(item && item.length > 0))
    .slice(0, 3)

  const outcomeCounts = history.reduce<Record<string, number>>((acc, item) => {
    if (!item.outcomeStatus) return acc
    acc[item.outcomeStatus] = (acc[item.outcomeStatus] || 0) + 1
    return acc
  }, {})

  return {
    totalDecisions: total,
    acceptCount,
    rejectCount,
    overrideRate: total ? Math.round((overrideCount / total) * 100) : 0,
    avgConfidence,
    outcomeCounts,
    topRationales
  }
}

function getUserRole(userEmail: string | undefined) {
  if (!userEmail) return 'staff'
  return 'attorney'
}

function parseAllowedRoles(value?: string | string[]) {
  if (!value) return null
  if (Array.isArray(value)) return value.map(role => role.toLowerCase())
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.map(role => String(role).toLowerCase())
    }
  } catch (error) {
    // ignore invalid json
  }
  return String(value)
    .split(',')
    .map(role => role.trim().toLowerCase())
    .filter(Boolean)
}

function canAccessThread(thread: { allowedRoles?: string | null }, role: string) {
  if (!thread.allowedRoles) return true
  const allowed = parseAllowedRoles(thread.allowedRoles)
  if (!allowed || allowed.length === 0) return true
  return allowed.includes(role.toLowerCase())
}

function extractMentions(message: string) {
  const emailMatches = message.match(/@[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []
  const tagMatches = message.match(/@[A-Za-z0-9._-]{2,}/g) || []
  const combined = Array.from(new Set([...emailMatches, ...tagMatches]))
  return combined.map(item => item.trim())
}

function summarizeComments(comments: Array<{ message: string }>) {
  const snippets = comments
    .map(comment => comment.message.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 5)
  if (snippets.length === 0) return null
  const summary = snippets.join(' | ')
  return summary.length > 400 ? `${summary.slice(0, 400)}…` : summary
}

function addDays(base: Date, days: number) {
  const next = new Date(base)
  next.setDate(next.getDate() + days)
  return next
}

function isReadinessAutomationMessage(message: string) {
  return /^\[Readiness\]\[/.test(message || '')
}

function getAutomationAuditLabel(action: string) {
  switch (action) {
    case 'automation_feed_created':
      return 'Auto-created'
    case 'automation_feed_snoozed':
      return 'Snoozed'
    case 'automation_feed_dismissed':
      return 'Dismissed'
    case 'automation_feed_sent':
      return 'Delivered'
    case 'automation_task_created':
      return 'Task queued'
    default:
      return 'Updated'
  }
}

async function writeAutomationAudit(args: {
  userId?: string | null
  attorneyId?: string | null
  action: string
  entityType: string
  entityId: string
  metadata?: Record<string, unknown>
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: args.userId || null,
        attorneyId: args.attorneyId || null,
        action: args.action,
        entityType: args.entityType,
        entityId: args.entityId,
        metadata: args.metadata ? JSON.stringify(args.metadata) : null,
      },
    })
  } catch (error: any) {
    logger.warn('Automation audit log write failed', { action: args.action, entityId: args.entityId, error: error?.message })
  }
}

async function createCaseReminder(assessmentId: string, channel: string, message: string, dueAt: Date) {
  return prisma.caseReminder.create({
    data: {
      assessmentId,
      channel,
      message,
      dueAt,
      status: 'scheduled',
      deliveryStatus: 'pending'
    }
  })
}

async function scheduleHealthAlerts(assessmentId: string, alerts: Array<{ type: string; severity: 'warning' | 'critical'; message: string }>) {
  const now = new Date()
  const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  for (const alert of alerts) {
    const message = `[Case Health] ${alert.type}: ${alert.message}`
    const existing = await prisma.caseReminder.findFirst({
      where: {
        assessmentId,
        message,
        createdAt: { gte: windowStart }
      }
    })
    if (!existing) {
      await createCaseReminder(assessmentId, 'email', message, now)
    }
  }
}

async function scheduleCadenceReminders(attorneyId: string, assessmentId: string, triggerEventType: string, eventDate: Date) {
  const templates = await prisma.negotiationCadenceTemplate.findMany({
    where: { attorneyId, triggerEventType, isActive: true },
    include: { steps: { orderBy: { sortOrder: 'asc' } } }
  })

  for (const template of templates) {
    for (const step of template.steps) {
      const dueAt = addDays(eventDate, step.offsetDays)
      const message = `[${template.name}] ${step.message}`
      await createCaseReminder(assessmentId, step.channel, message, dueAt)
    }
  }
}

function resolveStoragePath(filePath: string) {
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
}

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function extractAttorneyVenueStates(attorney: any) {
  const states = new Set<string>()
  const addState = (value: unknown) => {
    const text = String(value || '').trim().toUpperCase()
    if (/^[A-Z]{2}$/.test(text)) states.add(text)
  }

  for (const venue of safeJsonParse<any[]>(attorney?.venues, [])) {
    if (typeof venue === 'string') addState(venue)
    else addState(venue?.state)
  }

  for (const jurisdiction of safeJsonParse<any[]>(attorney?.attorneyProfile?.jurisdictions, [])) {
    addState(jurisdiction?.state)
  }

  addState(attorney?.attorneyProfile?.licenseState)
  addState(attorney?.lawFirm?.state)

  return Array.from(states)
}

const MEDICAL_EVIDENCE_CATEGORIES = new Set(['medical_records', 'bills', 'medical_bill'])
const MEDICAL_SHARING_PENDING_MESSAGE =
  'Medical records and extracted treatment details are pending plaintiff account creation and HIPAA authorization. The visible case summary is based on intake answers only until the plaintiff authorizes medical document sharing.'

function isMedicalEvidenceFile(file: any) {
  return MEDICAL_EVIDENCE_CATEGORIES.has(String(file?.category || '')) || MEDICAL_EVIDENCE_CATEGORIES.has(String(file?.subcategory || ''))
}

function buildMedicalSharingStatus(assessment: any) {
  const facts = typeof assessment?.facts === 'string'
    ? safeJsonParse<Record<string, any>>(assessment.facts, {})
    : (assessment?.facts || {})
  const hasPlaintiffAccount = Boolean(assessment?.userId || assessment?.user?.id)
  const hasHipaaConsent = facts?.consents?.hipaa === true
  const evidenceFiles = Array.isArray(assessment?.evidenceFiles) ? assessment.evidenceFiles : []
  const medicalFileCount = evidenceFiles.filter(isMedicalEvidenceFile).length
  const canShareMedicalData = hasPlaintiffAccount && hasHipaaConsent

  return {
    canShareMedicalData,
    hasPlaintiffAccount,
    hasHipaaConsent,
    medicalFileCount,
    status: canShareMedicalData ? 'authorized' : 'pending_authorization',
    message: canShareMedicalData ? null : MEDICAL_SHARING_PENDING_MESSAGE,
  }
}

function sanitizeAssessmentForAttorney(assessment: any) {
  if (!assessment) return assessment
  const medicalSharing = buildMedicalSharingStatus(assessment)
  if (medicalSharing.canShareMedicalData) {
    return { ...assessment, medicalSharing }
  }

  const facts = typeof assessment.facts === 'string'
    ? safeJsonParse<Record<string, any>>(assessment.facts, {})
    : (assessment.facts || {})
  const sanitizedFacts = {
    ...facts,
    treatment: Array.isArray(facts?.treatment)
      ? facts.treatment.filter((item: any) => String(item?.provider || '').toLowerCase() !== 'from uploaded records')
      : facts?.treatment,
  }

  return {
    ...assessment,
    facts: typeof assessment.facts === 'string' ? JSON.stringify(sanitizedFacts) : sanitizedFacts,
    evidenceFiles: Array.isArray(assessment.evidenceFiles)
      ? assessment.evidenceFiles.filter((file: any) => !isMedicalEvidenceFile(file))
      : assessment.evidenceFiles,
    medicalSharing,
  }
}

function sanitizeLeadForAttorney(lead: any) {
  return lead?.assessment
    ? { ...lead, assessment: sanitizeAssessmentForAttorney(lead.assessment) }
    : lead
}

function getPricingClaimType(assessment: any) {
  const facts = typeof assessment?.facts === 'string'
    ? safeJsonParse<Record<string, any>>(assessment.facts, {})
    : (assessment?.facts || {})
  return facts?.caseTypeValidation?.validatedClaimType || assessment?.claimType
}

function pickLatestPrediction(predictions: any[] | undefined) {
  if (!Array.isArray(predictions) || predictions.length === 0) return null
  return [...predictions].sort((a, b) => {
    const aDate = new Date(a.createdAt || 0).getTime()
    const bDate = new Date(b.createdAt || 0).getTime()
    return bDate - aDate
  })[0]
}

function buildRiskProfile(params: {
  evidenceCount: number
  injuryCount: number
  treatmentCount: number
  insuranceLimit: number | null
  viabilityScore: number | null
}) {
  let riskScore = 50
  if (params.viabilityScore !== null) {
    riskScore -= (params.viabilityScore - 50) * 0.4
  }
  if (params.evidenceCount < 3) riskScore += 12
  if (params.injuryCount === 0) riskScore += 8
  if (params.treatmentCount === 0) riskScore += 6
  if (params.insuranceLimit !== null && params.insuranceLimit < 25000) riskScore += 6
  if (params.evidenceCount > 6) riskScore -= 6
  riskScore = Math.max(0, Math.min(100, Math.round(riskScore)))
  const riskLevel = riskScore >= 70 ? 'high' : riskScore >= 45 ? 'medium' : 'low'
  return { riskScore, riskLevel }
}

function parseReadinessReminder(reminder: {
  id: string
  assessmentId: string
  message: string
  dueAt: Date
  createdAt: Date
  updatedAt: Date
  status: string
}, leadByAssessmentId: Map<string, any>, auditEventsByReminderId: Map<string, Array<{ action: string; createdAt: Date }>>) {
  const lead = leadByAssessmentId.get(reminder.assessmentId)
  if (!lead) return null
  const match = reminder.message.match(/^\[Readiness\]\[([^\]]+)\]\s*(.*)$/)
  const category = match?.[1] || 'general'
  const detail = match?.[2] || reminder.message

  let title = 'Automation update'
  let severity: 'high' | 'medium' | 'low' = 'medium'
  let actionLabel = 'Open case'
  let targetSection = 'overview'

  if (category === 'missing_docs') {
    title = 'Documents requested by automation'
    severity = 'high'
    actionLabel = 'Open document workflow'
    targetSection = 'evidence'
  } else if (category === 'treatment_gap') {
    title = 'Treatment gap needs review'
    severity = 'high'
    actionLabel = 'Open health workspace'
    targetSection = 'health'
  } else if (category === 'negotiation') {
    title = 'Negotiation follow-up queued'
    severity = 'medium'
    actionLabel = 'Open negotiation workspace'
    targetSection = 'negotiation'
  } else if (category === 'demand_ready') {
    title = 'Demand-ready automation alert'
    severity = 'medium'
    actionLabel = 'Open demand workspace'
    targetSection = 'demand'
  }

  const activityTrail = (auditEventsByReminderId.get(reminder.id) || [])
    .map((event) => ({
      label: getAutomationAuditLabel(event.action),
      at: event.createdAt.toISOString(),
    }))
    .slice(-4)

  if (activityTrail.length === 0) {
    activityTrail.push({
      label: 'Auto-created',
      at: reminder.createdAt.toISOString(),
    })
    if (reminder.updatedAt.getTime() - reminder.createdAt.getTime() > 60 * 1000 && reminder.status === 'scheduled') {
      activityTrail.push({
        label: 'Snoozed',
        at: reminder.updatedAt.toISOString(),
      })
    }
  }

  return {
    id: reminder.id,
    leadId: lead.id,
    assessmentId: reminder.assessmentId,
    plaintiffName: [lead.assessment?.user?.firstName, lead.assessment?.user?.lastName].filter(Boolean).join(' ') || 'Plaintiff',
    claimType: lead.assessment?.claimType || 'case',
    category,
    title,
    detail,
    severity,
    actionLabel,
    targetSection,
    dueAt: reminder.dueAt.toISOString(),
    createdAt: reminder.createdAt.toISOString(),
    updatedAt: reminder.updatedAt.toISOString(),
    status: reminder.status,
    activityTrail,
  }
}

function calculateFeeSplit(projectedRecovery: number | null | undefined, feeSplitPercent: number | null | undefined) {
  if (!projectedRecovery || !feeSplitPercent) {
    return { referringFeeAmount: null, receivingFeeAmount: null }
  }
  const receivingFeeAmount = (projectedRecovery * feeSplitPercent) / 100
  const referringFeeAmount = Math.max(0, projectedRecovery - receivingFeeAmount)
  return { referringFeeAmount, receivingFeeAmount }
}

async function createNotification(
  recipient: string,
  subject: string,
  message: string,
  metadata?: Record<string, unknown>,
  opts?: {
    // Sender identity so attorney-originated mail is branded to the attorney.
    replyTo?: string | null
    fromName?: string | null
    // When known, links an in-app notification to the plaintiff user.
    userId?: string | null
    assessmentId?: string | null
    role?: 'plaintiff' | 'attorney' | 'admin'
  }
) {
  if (!recipient) return
  // Actually deliver (email + recorded notification) instead of only recording a
  // row. Best-effort: deliverDirectNotification never throws to callers here.
  try {
    await deliverDirectNotification({
      type: 'email',
      recipient,
      subject,
      message,
      metadata,
      replyTo: opts?.replyTo ?? null,
      fromName: opts?.fromName ?? null,
      userId: opts?.userId ?? null,
      assessmentId: opts?.assessmentId ?? (typeof metadata?.assessmentId === 'string' ? metadata.assessmentId : null),
      role: opts?.role,
    })
  } catch (err) {
    logger.warn('createNotification delivery failed', { error: err instanceof Error ? err.message : String(err) })
  }
}

const intakeManualSchema = z.object({
  template: z.string().optional(),
  claimType: z.string().optional(),
  venueState: z.string().optional(),
  notes: z.string().optional(),
  plaintiffFirstName: z.string().optional(),
  plaintiffLastName: z.string().optional(),
  plaintiffEmail: z.string().email().optional(),
  plaintiffPhone: z.string().optional(),
  sendInvite: z.boolean().optional()
})

const intakeFromLeadSchema = z.object({
  leadId: z.string()
})

const intakeImportSchema = z.object({
  source: z.enum(['clio', 'filevine', 'needles', 'litify', 'spreadsheet']),
  includeDocuments: z.coerce.boolean().optional(),
  includeHistory: z.coerce.boolean().optional(),
  includeTasks: z.coerce.boolean().optional(),
  includeMedical: z.coerce.boolean().optional(),
  notes: z.string().optional(),
  files: z.array(z.object({ name: z.string(), size: z.number().optional() })).optional()
})

const smartIntakeSchema = z.object({
  dynamicQuestionnaires: z.boolean(),
  conditionalLogic: z.boolean(),
  missingInfoDetection: z.boolean(),
  autoFollowUps: z.boolean()
})

function getTemplateClaimType(template?: string) {
  switch ((template || '').toLowerCase()) {
    case 'mva':
      return 'auto'
    case 'premises':
      return 'slip_and_fall'
    case 'medmal':
      return 'medmal'
    case 'pi':
    default:
      return 'auto'
  }
}

async function createDraftAssessment(payload: {
  claimType?: string
  venueState?: string
  venueCounty?: string | null
  plaintiffFirstName?: string
  plaintiffLastName?: string
  plaintiffEmail?: string
  plaintiffPhone?: string
  incidentDate?: string
  narrative?: string
  source?: string
  externalId?: string | null
  rawImport?: Record<string, unknown>
}) {
  const claimType = payload.claimType || 'auto'
  const venueState = payload.venueState || 'CA'
  const facts = {
    incident: {
      date: payload.incidentDate || new Date().toISOString().split('T')[0],
      narrative: payload.narrative || ''
    },
    injuries: [],
    treatment: [],
    damages: {},
    plaintiffContext: {
      firstName: payload.plaintiffFirstName || '',
      lastName: payload.plaintiffLastName || '',
      email: payload.plaintiffEmail || '',
      phone: payload.plaintiffPhone || ''
    },
    importSource: payload.source
      ? {
          source: payload.source,
          externalId: payload.externalId || null,
          raw: payload.rawImport || null
        }
      : undefined,
    consents: { tos: false, privacy: false, ml_use: false, hipaa: false }
  }
  return prisma.assessment.create({
    data: {
      claimType,
      venueState,
      venueCounty: payload.venueCounty || null,
      status: 'DRAFT',
      facts: JSON.stringify(facts)
    }
  })
}

type IntakeImportSource = z.infer<typeof intakeImportSchema>['source']

type ParsedImportFile = {
  fileName: string
  rows: Record<string, string>[]
  unsupportedReason?: string
}

type NormalizedImportedCase = {
  externalId: string | null
  claimType: string
  venueState: string
  venueCounty: string | null
  plaintiffFirstName: string
  plaintiffLastName: string
  plaintiffEmail: string
  plaintiffPhone: string
  incidentDate?: string
  narrative: string
  taskTitle?: string
  taskDueDate?: Date | null
  raw: Record<string, string>
}

function parseBoolean(value: unknown, fallback = true) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true
    if (['false', '0', 'no', 'off'].includes(normalized)) return false
  }
  return fallback
}

function splitDelimitedLine(line: string, delimiter: ',' | '\t') {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]
    if (char === '"' && inQuotes && next === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current.trim())
  return cells
}

function parseDelimitedRows(content: string, delimiter: ',' | '\t') {
  const lines = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
  if (lines.length === 0) return []
  const headers = splitDelimitedLine(lines[0], delimiter).map((header) => header.trim())
  return lines.slice(1).map((line) => {
    const values = splitDelimitedLine(line, delimiter)
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = values[index] || ''
      return row
    }, {})
  })
}

function parseJsonRows(content: string) {
  const parsed = JSON.parse(content)
  if (Array.isArray(parsed)) return parsed
  if (Array.isArray(parsed.cases)) return parsed.cases
  if (Array.isArray(parsed.matters)) return parsed.matters
  if (Array.isArray(parsed.projects)) return parsed.projects
  return [parsed]
}

function parseImportFile(file: Express.Multer.File): ParsedImportFile {
  const extension = path.extname(file.originalname).toLowerCase()
  if (['.xlsx', '.xls'].includes(extension)) {
    return {
      fileName: file.originalname,
      rows: [],
      unsupportedReason: 'XLS/XLSX files are stored with the import request. Export as CSV to auto-create cases.',
    }
  }

  const content = file.buffer.toString('utf8')
  if (extension === '.json' || file.mimetype === 'application/json') {
    return {
      fileName: file.originalname,
      rows: parseJsonRows(content).map((row: unknown) => flattenImportRow(row)),
    }
  }

  const delimiter = extension === '.tsv' || file.mimetype === 'text/tab-separated-values' ? '\t' : ','
  return {
    fileName: file.originalname,
    rows: parseDelimitedRows(content, delimiter),
  }
}

function flattenImportRow(value: unknown, prefix = ''): Record<string, string> {
  if (!value || typeof value !== 'object') return {}
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((row, [key, nested]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      Object.assign(row, flattenImportRow(nested, nextKey))
    } else if (Array.isArray(nested)) {
      row[nextKey] = nested.map((item) => typeof item === 'object' ? JSON.stringify(item) : String(item)).join('; ')
    } else {
      row[nextKey] = nested == null ? '' : String(nested)
    }
    return row
  }, {})
}

function getImportField(row: Record<string, string>, candidates: string[]) {
  const entries = Object.entries(row)
  for (const candidate of candidates) {
    const normalizedCandidate = candidate.toLowerCase().replace(/[^a-z0-9]/g, '')
    const match = entries.find(([key]) => key.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedCandidate)
    if (match?.[1]) return match[1].trim()
  }
  return ''
}

function splitClientName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] }
}

function normalizeClaimType(value: string) {
  const text = value.toLowerCase()
  if (text.includes('premise') || text.includes('slip') || text.includes('fall')) return 'slip_and_fall'
  if (text.includes('medical') || text.includes('malpractice') || text.includes('med mal')) return 'medmal'
  if (text.includes('dog')) return 'dog_bite'
  if (text.includes('auto') || text.includes('motor') || text.includes('vehicle') || text.includes('mva')) return 'auto'
  return value ? value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') : 'auto'
}

function normalizeIncidentDate(value: string) {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString().split('T')[0]
}

function normalizeImportedCase(source: IntakeImportSource, row: Record<string, string>): NormalizedImportedCase {
  const sourceSpecific: Record<IntakeImportSource, Record<string, string[]>> = {
    clio: {
      externalId: ['matter id', 'matter number', 'id', 'display number'],
      clientName: ['client name', 'client', 'primary client'],
      claimType: ['practice area', 'matter type', 'case type'],
      narrative: ['description', 'matter description', 'notes'],
    },
    filevine: {
      externalId: ['project id', 'projectId', 'project number', 'filevine id'],
      clientName: ['client name', 'clientName', 'contact name', 'project name'],
      claimType: ['project type', 'case type', 'phase name'],
      narrative: ['project description', 'summary', 'facts', 'notes'],
    },
    needles: {
      externalId: ['case number', 'case_num', 'file number', 'matter number'],
      clientName: ['client', 'client name', 'party name'],
      claimType: ['case type', 'matter type', 'classification'],
      narrative: ['case facts', 'description', 'notes', 'memo'],
    },
    litify: {
      externalId: ['matter id', 'litify id', 'matter name', 'case id'],
      clientName: ['client name', 'client', 'account name', 'matter name'],
      claimType: ['matter type', 'case type', 'practice area'],
      narrative: ['description', 'case summary', 'facts', 'notes'],
    },
    spreadsheet: {
      externalId: ['external id', 'case id', 'matter id', 'file number'],
      clientName: ['client name', 'plaintiff name', 'name'],
      claimType: ['claim type', 'case type', 'matter type'],
      narrative: ['narrative', 'description', 'facts', 'notes'],
    },
  }
  const mapping = sourceSpecific[source]
  const clientName = getImportField(row, mapping.clientName)
  const splitName = splitClientName(clientName)
  const firstName = getImportField(row, ['plaintiff first name', 'first name', 'client first name', 'firstName']) || splitName.firstName
  const lastName = getImportField(row, ['plaintiff last name', 'last name', 'client last name', 'lastName']) || splitName.lastName
  const claimType = getImportField(row, ['claim type', 'case type', 'matter type', ...mapping.claimType])

  return {
    externalId: getImportField(row, ['external id', 'case id', 'matter id', ...mapping.externalId]) || null,
    claimType: normalizeClaimType(claimType),
    venueState: (getImportField(row, ['venue state', 'state', 'jurisdiction state']) || 'CA').toUpperCase(),
    venueCounty: getImportField(row, ['venue county', 'county', 'jurisdiction county']) || null,
    plaintiffFirstName: firstName,
    plaintiffLastName: lastName,
    plaintiffEmail: getImportField(row, ['plaintiff email', 'client email', 'email']),
    plaintiffPhone: getImportField(row, ['plaintiff phone', 'client phone', 'phone', 'mobile']),
    incidentDate: normalizeIncidentDate(getImportField(row, ['incident date', 'date of loss', 'dol', 'doi', 'accident date'])),
    narrative: getImportField(row, ['narrative', 'description', 'facts', 'summary', ...mapping.narrative]),
    taskTitle: getImportField(row, ['next task', 'task title', 'deadline name']),
    taskDueDate: normalizeTaskDueDate(getImportField(row, ['task due date', 'deadline', 'due date'])),
    raw: row,
  }
}

function normalizeTaskDueDate(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

async function applyTaskSlaTemplates(attorneyId: string, assessmentId: string, triggerStatus: string) {
  const templates = await prisma.taskSlaTemplate.findMany({
    where: { attorneyId, triggerStatus, isActive: true },
    include: { steps: { orderBy: { offsetDays: 'asc' } } }
  })

  for (const template of templates) {
    for (const step of template.steps) {
      const dueDate = addDays(new Date(), step.offsetDays)
      const existing = await prisma.caseTask.findFirst({
        where: {
          assessmentId,
          title: step.title,
          status: 'open'
        }
      })
      if (existing) continue
      await prisma.caseTask.create({
        data: {
          assessmentId,
          title: step.title,
          dueDate,
          priority: step.priority || 'medium',
          status: 'open'
        }
      })
    }
  }
}

async function createInvoiceReminder(assessmentId: string, invoice: { id: string; amount: number; dueDate: Date | null }) {
  if (!invoice.dueDate) return
  const dueReminder = addDays(invoice.dueDate, -3)
  if (dueReminder.getTime() < Date.now()) return
  const message = `Invoice ${invoice.id} is due on ${invoice.dueDate.toDateString()}`
  await createCaseReminder(assessmentId, 'email', message, dueReminder)
}

async function scheduleTaskReminder(assessmentId: string, task: { title: string; dueDate: Date | null; reminderAt?: Date | null }) {
  const dueAt = task.reminderAt || (task.dueDate ? addDays(task.dueDate, -1) : null)
  if (!dueAt) return
  if (dueAt.getTime() < Date.now()) return
  const message = `Task reminder: ${task.title} due ${task.dueDate ? task.dueDate.toDateString() : 'soon'}.`
  const existing = await prisma.caseReminder.findFirst({
    where: {
      assessmentId,
      channel: 'email',
      message,
      dueAt,
    },
  })
  if (!existing) {
    await createCaseReminder(assessmentId, 'email', message, dueAt)
  }
}

async function scheduleEscalationAlert(assessmentId: string, task: { title: string; dueDate: Date | null; escalationLevel?: string }) {
  if (!task.dueDate) return
  if (task.escalationLevel === 'none') return
  const dueAt = task.escalationLevel === 'critical'
    ? task.dueDate
    : addDays(task.dueDate, -1)
  const scheduledAt = dueAt.getTime() < Date.now() ? new Date() : dueAt
  const message = scheduledAt.getTime() > task.dueDate.getTime()
    ? `Escalation: Task overdue — ${task.title} was due ${task.dueDate.toDateString()}.`
    : `Escalation: ${task.title} is due ${task.dueDate.toDateString()}.`
  const existing = await prisma.caseReminder.findFirst({
    where: {
      assessmentId,
      channel: 'email',
      message,
      dueAt: scheduledAt,
    },
  })
  if (!existing) {
    await createCaseReminder(assessmentId, 'email', message, scheduledAt)
  }
}

async function createReadinessTasks(leadId: string, assessmentId: string) {
  const summary = await buildCaseCommandCenter({ assessmentId, leadId })
  const plan = buildReadinessAutomationPlan(summary)
  const existingTasks = await prisma.caseTask.findMany({
    where: { assessmentId, status: { not: 'done' } },
    select: { title: true },
  })
  const existingTitles = new Set(existingTasks.map((task) => task.title.trim().toLowerCase()))
  const created: any[] = []

  for (const suggestion of plan.tasks) {
    const normalizedTitle = suggestion.title.trim().toLowerCase()
    if (existingTitles.has(normalizedTitle)) continue
    const dueDate = addDays(new Date(), suggestion.dueInDays)
    const reminderAt = addDays(new Date(), suggestion.remindInDays)
    const record = await prisma.caseTask.create({
      data: {
        assessmentId,
        title: suggestion.title,
        dueDate,
        reminderAt,
        priority: suggestion.priority,
        status: 'open',
        notes: suggestion.notes,
        taskType: suggestion.taskType,
        checkpointType: suggestion.checkpointType,
        escalationLevel: suggestion.escalationLevel,
        assignedRole: 'attorney',
      },
      select: caseTaskSelect,
    })
    await scheduleTaskReminder(assessmentId, {
      title: record.title,
      dueDate: record.dueDate,
      reminderAt: record.reminderAt,
    })
    await scheduleEscalationAlert(assessmentId, {
      title: record.title,
      dueDate: record.dueDate,
      escalationLevel: record.escalationLevel,
    })
    created.push(record)
    existingTitles.add(normalizedTitle)
  }

  return { summary, plan, tasks: created }
}

async function syncReadinessAutomation(leadId: string, assessmentId: string) {
  const { summary, plan, tasks } = await createReadinessTasks(leadId, assessmentId)
  const remindersCreated: any[] = []

  for (const reminder of plan.reminders) {
    const latest = await prisma.caseReminder.findFirst({
      where: {
        assessmentId,
        channel: 'email',
        message: {
          startsWith: `[Readiness][${reminder.category}]`,
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    if (latest?.message === reminder.message) continue
    const record = await createCaseReminder(assessmentId, 'email', reminder.message, addDays(new Date(), reminder.dueInDays))
    remindersCreated.push(record)
  }

  return { summary, tasks, reminders: remindersCreated }
}

// Lead Quality + Transparency endpoints

// Get attorney dashboard with lead quality metrics
router.get('/dashboard', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user || !req.user.id || !req.user.email) {
      logger.error('Dashboard request missing user info', { 
        hasUser: !!req.user,
        userId: req.user?.id,
        userEmail: req.user?.email
      })
      return res.status(401).json({ 
        error: 'Authentication required',
        details: 'User information not found in request'
      })
    }

    const userId = req.user.id
    const userEmail = (req.user.email || '').trim().toLowerCase()

    logger.info('Dashboard request received', { userId, userEmail })

    // Find attorney by email (attorneys and users share the same email)
    // Try exact match first, then case-insensitive + trimmed
    let attorney
    try {
      attorney = await prisma.attorney.findUnique({
        where: { email: req.user.email }
      })
      if (!attorney && userEmail) {
        // Case-insensitive + trimmed fallback (handles aaron@x.com vs Aaron@x.com, whitespace)
        const allAttorneys = await prisma.attorney.findMany({
          where: { email: { not: null } }
        })
        const matched = allAttorneys.find(a =>
          a.email && a.email.trim().toLowerCase() === userEmail
        )
        if (matched) {
          attorney = matched
          logger.info('Found attorney by case-insensitive/trimmed email match', { attorneyId: attorney.id })
        }
      }
      logger.info('Attorney lookup result', {
        found: !!attorney,
        userEmail,
        attorneyId: attorney?.id,
        attorneyEmail: attorney?.email
      })
    } catch (dbError: any) {
      logger.error('Database error finding attorney', {
        error: dbError?.message,
        stack: dbError?.stack,
        userEmail
      })
      return res.status(500).json({
        error: 'Database error while looking up attorney',
        details: process.env.NODE_ENV === 'development' ? dbError?.message : undefined
      })
    }

    if (!attorney) {
      logger.error('Attorney profile not found for user', { 
        userId, 
        userEmail,
        message: 'Attorney registration may not have completed successfully'
      })
      return res.status(404).json({ 
        error: 'Attorney profile not found. Please complete your attorney registration or contact support.',
        details: process.env.NODE_ENV === 'development' ? `User email: ${userEmail}` : undefined
      })
    }

    const attorneyId = attorney.id

    // Get or create dashboard
    let dashboard
    try {
      // First try without nested includes to see if that's the issue
      dashboard = await prisma.attorneyDashboard.findUnique({
        where: { attorneyId }
      })
      
      // If dashboard exists, fetch attorney separately. Some deployed DBs may lag
      // the current AttorneyProfile Prisma model, so profile fetch is best effort.
      if (dashboard) {
        const attorneyWithProfile = await fetchAttorneyForDashboard(attorneyId)
        // Attach attorney data to dashboard object
        dashboard = {
          ...dashboard,
          attorney: attorneyWithProfile
        } as any
      }
    } catch (dbError: any) {
      logger.error('Database error finding dashboard', { 
        error: dbError?.message, 
        stack: dbError?.stack,
        attorneyId,
        errorCode: dbError?.code,
        errorName: dbError?.name
      })
      console.error('Full database error:', dbError)
      return res.status(500).json({ 
        error: 'Database error while looking up dashboard',
        details: process.env.NODE_ENV === 'development' ? dbError?.message : undefined,
        errorCode: process.env.NODE_ENV === 'development' ? dbError?.code : undefined
      })
    }

    if (!dashboard) {
      logger.info('Creating new dashboard for attorney', { attorneyId })
      try {
        dashboard = await prisma.attorneyDashboard.create({
          data: { 
            attorneyId,
            totalLeadsReceived: 0,
            totalLeadsAccepted: 0,
            totalPlatformSpend: 0,
            pricingModel: 'per_lead'
          }
        })
        
        // Fetch attorney separately. Some deployed DBs may lag the current
        // AttorneyProfile Prisma model, so profile fetch is best effort.
        const attorneyWithProfile = await fetchAttorneyForDashboard(attorneyId)
        
        // Attach attorney data to dashboard
        dashboard = {
          ...dashboard,
          attorney: attorneyWithProfile
        } as any
        
        logger.info('Dashboard created successfully', { dashboardId: dashboard.id })
      } catch (createError: any) {
        logger.error('Failed to create dashboard', { 
          error: createError.message, 
          attorneyId,
          stack: createError.stack,
          errorCode: createError.code,
          errorName: createError.name
        })
        console.error('Full create error:', createError)
        throw createError
      }
    }

    const dashboardLeadWhere = {
      OR: [
        { assignedAttorneyId: attorneyId },
        {
          assessment: {
            introductions: {
              some: { attorneyId }
            }
          }
        }
      ]
    }
    const dashboardLeadInclude = {
      assessment: {
        include: {
          predictions: true,
          files: true,
          evidenceFiles: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          introductions: {
            where: { attorneyId },
            orderBy: { requestedAt: 'desc' as const },
            take: 1,
            select: {
              id: true,
              status: true,
              requestedAt: true,
              respondedAt: true,
              waveNumber: true
            }
          }
        }
      },
      contactAttempts: { where: { attorneyId } },
      conflictChecks: { where: { attorneyId } },
      qualityReports: true,
      documentRequests: { where: { attorneyId, status: 'pending' } }
    }
    const dashboardLeadPipelineSelect = {
      id: true,
      assessmentId: true,
      status: true,
      submittedAt: true,
      updatedAt: true,
      lastContactAt: true,
      contactAttempts: {
        where: { attorneyId },
        select: { completedAt: true, createdAt: true }
      },
      documentRequests: {
        where: { attorneyId, status: 'pending' },
        select: { id: true }
      },
      assessment: {
        select: {
          predictions: {
            orderBy: { createdAt: 'desc' as const },
            take: 1,
            select: { viability: true, bands: true }
          }
        }
      }
    }

    // Load the attorney's lead universe once, then derive recent/pipeline views from it.
    let recentLeads: any[] = []
    let allLeadsForPipeline: any[] = []
    let totalLeadsReceived = 0
    try {
      const [dashboardLeads, pipelineLeads, leadCount] = await Promise.all([
        prisma.leadSubmission.findMany({
          where: dashboardLeadWhere,
          include: dashboardLeadInclude,
          orderBy: { submittedAt: 'desc' },
          take: 100
        }),
        prisma.leadSubmission.findMany({
          where: dashboardLeadWhere,
          select: dashboardLeadPipelineSelect
        }),
        prisma.leadSubmission.count({
          where: dashboardLeadWhere
        })
      ])
      allLeadsForPipeline = pipelineLeads
      recentLeads = dashboardLeads
      totalLeadsReceived = leadCount
    } catch (leadsError: any) {
      logger.error('Database error fetching dashboard leads', {
        error: leadsError?.message,
        stack: leadsError?.stack,
        attorneyId
      })
      recentLeads = []
      allLeadsForPipeline = []
      totalLeadsReceived = 0
    }

    logger.info('Recent leads fetched', { count: recentLeads.length, attorneyId })

    // Kick off analysis generation for leads missing ChatGPT analysis (non-blocking)
    const leadsNeedingAnalysis = (recentLeads || [])
      .filter(lead => lead.assessment && !lead.assessment.chatgptAnalysis)
      .slice(0, 3)

    if (leadsNeedingAnalysis.length > 0) {
      void (async () => {
        for (const lead of leadsNeedingAnalysis) {
          try {
            const facts = JSON.parse(lead.assessment.facts)
            const evidenceData = (lead.assessment.evidenceFiles || []).map((file: any) => ({
              id: file.id,
              filename: file.filename,
              category: file.category,
              processingStatus: file.processingStatus,
              summary: file.aiSummary || null,
              highlights: file.aiHighlights ? JSON.parse(file.aiHighlights) : null
            }))

            const analysisRequest: CaseAnalysisRequest = {
              assessmentId: lead.assessment.id,
              caseData: {
                ...facts,
                evidence: evidenceData
              }
            }

            const analysisResult = await analyzeCaseWithChatGPT(analysisRequest)

            await prisma.assessment.update({
              where: { id: lead.assessment.id },
              data: {
                chatgptAnalysis: JSON.stringify(analysisResult),
                chatgptAnalysisDate: new Date()
              }
            })
          } catch (analysisError: any) {
            logger.error('Failed to generate ChatGPT analysis in dashboard', { 
              error: analysisError.message,
              leadId: lead.id 
            })
          }
        }
      })()
    }

    // Calculate lead quality metrics
    let qualityMetrics
    let urgentLeads
    try {
      qualityMetrics = {
        totalLeads: recentLeads.length,
        averageViability: recentLeads.length > 0 
          ? recentLeads.reduce((sum, lead) => sum + (lead.viabilityScore || 0), 0) / recentLeads.length 
          : 0,
        exclusiveLeads: recentLeads.filter(lead => lead.isExclusive).length,
        hotLeads: recentLeads.filter(lead => lead.hotnessLevel === 'hot').length,
        evidenceComplete: recentLeads.filter(lead => {
          try {
            if (!lead.evidenceChecklist) return false
            const checklist = JSON.parse(lead.evidenceChecklist)
            return checklist.required && Array.isArray(checklist.required) && checklist.required.every((item: any) => item.uploaded)
          } catch (e) {
            return false
          }
        }).length
      }

      // Get SOL alerts for urgent cases
      urgentLeads = recentLeads.filter(lead => {
        try {
          if (!lead.assessment?.facts) return false
          const facts = typeof lead.assessment.facts === 'string' 
            ? JSON.parse(lead.assessment.facts) 
            : lead.assessment.facts
          if (!facts || !facts.incident || !facts.incident.date) return false
          const incidentDate = new Date(facts.incident.date)
          if (isNaN(incidentDate.getTime())) return false
          const daysSinceIncident = Math.floor((Date.now() - incidentDate.getTime()) / (1000 * 60 * 60 * 24))
          return daysSinceIncident > 300 // Approaching 1 year SOL
        } catch (e) {
          logger.warn('Error parsing lead facts for SOL check', { error: e, leadId: lead.id })
          return false
        }
      })
    } catch (metricsError: any) {
      logger.error('Error calculating quality metrics', { 
        error: metricsError?.message, 
        stack: metricsError?.stack 
      })
      qualityMetrics = {
        totalLeads: 0,
        averageViability: 0,
        exclusiveLeads: 0,
        hotLeads: 0,
        evidenceComplete: 0
      }
      urgentLeads = []
    }

    // Ensure dashboard exists
    if (!dashboard) {
      logger.error('Dashboard is null after creation attempt', { attorneyId })
      return res.status(500).json({ 
        error: 'Failed to create dashboard',
        details: 'Dashboard could not be created or retrieved'
      })
    }

    let feesCollectedFromPayments = 0
    const totalPlatformSpend = Number(dashboard.totalPlatformSpend ?? 0)
    try {
      const paymentTotals = await prisma.billingPayment.aggregate({
        where: {
          assessment: {
            leadSubmission: {
              is: dashboardLeadWhere
            }
          }
        },
        _sum: {
          amount: true
        }
      })
      feesCollectedFromPayments = Number(paymentTotals._sum.amount ?? 0)
    } catch (billingError: any) {
      logger.warn('Failed to aggregate attorney billing payments', {
        error: billingError?.message,
        attorneyId
      })
    }

    // Active cases by workflow stage use the shared lead universe from above.
    // 6-stage pipeline: Matched (includes PENDING) → Accepted → Contacted → Consult Scheduled → Retained → Closed
    // Matched = case routed to attorney (status submitted). Includes both routingLocked (accepted) and !routingLocked (PENDING intro).
    const hasMadeContact = (l: any) => {
      if (l.lastContactAt) return true
      const attempts = (l.contactAttempts || []).filter((a: any) => a.completedAt)
      if (attempts.length > 0) return true
      // Accepted cases (status=contacted) count as contacted for display
      return (l.status || '') === 'contacted'
    }
    const matched = (allLeadsForPipeline || []).filter((l: any) => l.status === 'submitted')
    const accepted = (allLeadsForPipeline || []).filter((l: any) => l.status === 'contacted' && !hasMadeContact(l))
    const contacted = (allLeadsForPipeline || []).filter((l: any) => l.status === 'contacted' && hasMadeContact(l))
    const consultScheduled = (allLeadsForPipeline || []).filter((l: any) => l.status === 'consulted')
    const retained = (allLeadsForPipeline || []).filter((l: any) => l.status === 'retained')
    const closed = (allLeadsForPipeline || []).filter((l: any) => l.status === 'rejected')
    const acceptedCount = accepted.length + contacted.length + consultScheduled.length + retained.length
    const retainedCount = retained.length
    // Conversion = retained / accepted (not retained/total which can exceed 100%)
    const conversionRate = acceptedCount > 0 ? Math.round((retainedCount / acceptedCount) * 100) : 0

    // Pipeline conversion rates (6-stage funnel)
    const funnelMatched = matched.length
    const funnelAccepted = accepted.length
    const funnelContacted = contacted.length
    const funnelConsultScheduled = consultScheduled.length
    const funnelRetained = retained.length
    const funnelClosed = closed.length

    // Top case today: best by expected_value * viability, from matched
    const topCaseToday = matched.length > 0
      ? matched
          .map((lead: any) => {
            const pred = lead.assessment?.predictions?.[0] || lead.assessment?.predictions
            const predObj = Array.isArray(pred) ? pred[0] : pred
            let viability = 0
            let median = 0
            if (predObj?.viability) {
              try {
                const v = typeof predObj.viability === 'string' ? JSON.parse(predObj.viability) : predObj.viability
                viability = v.overall ?? 0
              } catch {}
            }
            if (predObj?.bands) {
              try {
                const b = typeof predObj.bands === 'string' ? JSON.parse(predObj.bands) : predObj.bands
                median = b.median ?? 0
              } catch {}
            }
            return { lead, score: (median || 1000) * (viability || 0.1) }
          })
          .sort((a: any, b: any) => b.score - a.score)[0]?.lead
      : null

    // Pipeline value: sum(expected_case_value × contingency_rate) for active leads
    const CONTINGENCY_RATE = 0.33
    const getLeadMedian = (lead: any) => {
      const pred = lead.assessment?.predictions?.[0] || lead.assessment?.predictions
      const predObj = Array.isArray(pred) ? pred[0] : pred
      if (!predObj?.bands) return 0
      try {
        const b = typeof predObj.bands === 'string' ? JSON.parse(predObj.bands) : predObj.bands
        return b.median ?? b.p50 ?? (b.low && b.high ? (b.low + b.high) / 2 : 0)
      } catch { return 0 }
    }
    const activeLeadsForValue = [...accepted, ...contacted, ...consultScheduled, ...retained]
    const pipelineValue = activeLeadsForValue.reduce((sum: number, lead: any) => {
      const median = getLeadMedian(lead)
      return sum + (median || 0) * CONTINGENCY_RATE
    }, 0)
    const retainedValue = retained.reduce((sum: number, lead: any) => sum + getLeadMedian(lead) * CONTINGENCY_RATE, 0)

    // Pipeline alerts
    const now = new Date()
    const HOURS_24 = 24 * 60 * 60 * 1000
    const matchedExpiringSoon = matched.filter((l: any) => {
      const submitted = new Date(l.submittedAt).getTime()
      return (now.getTime() - submitted) > (48 - 4) * 60 * 60 * 1000 // expiring in ~4 hours if 48h window
    }).length
    const acceptedNeedsFollowUp = accepted.filter((l: any) => {
      const lastContact = l.lastContactAt ? new Date(l.lastContactAt).getTime() : 0
      const attempts = (l.contactAttempts || []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const lastAttemptAt = attempts[0]?.completedAt ? new Date(attempts[0].completedAt).getTime() : new Date(l.updatedAt).getTime()
      return (now.getTime() - Math.max(lastContact, lastAttemptAt)) > HOURS_24
    }).length

    // Cases requiring attention: no contact 24h+, missing docs, consult approaching
    let casesRequiringAttention = 0
    const consultApproachingHours = 24
    let upcomingAppointments: any[] = []
    try {
      upcomingAppointments = await prisma.appointment.findMany({
        where: {
          attorneyId,
          assessmentId: { not: null },
          status: 'SCHEDULED',
          scheduledAt: { gte: now }
        },
        include: {
          assessment: {
            include: {
              user: { select: { firstName: true, lastName: true } }
            }
          }
        },
        orderBy: { scheduledAt: 'asc' },
        take: 20
      })
    } catch (aptError: any) {
      logger.warn('Upcoming appointments query failed', { error: aptError?.message })
    }
    const consultApproaching = upcomingAppointments.filter((a: any) => {
      const diff = new Date(a.scheduledAt).getTime() - now.getTime()
      return diff > 0 && diff <= consultApproachingHours * 60 * 60 * 1000
    }).length
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
    const consultToday = upcomingAppointments.filter((a: any) => {
      const t = new Date(a.scheduledAt).getTime()
      return t >= todayStart.getTime() && t < todayEnd.getTime()
    }).length
    casesRequiringAttention += acceptedNeedsFollowUp
    casesRequiringAttention += (allLeadsForPipeline || []).filter((l: any) => (l.documentRequests || []).length > 0).length
    casesRequiringAttention += consultApproaching

    // Upcoming consults for calendar (lookup leadId by assessmentId)
    let leadByAssessment: Record<string, string> = {}
    try {
      const assessmentIds = [...new Set(upcomingAppointments.map((a: any) => a.assessmentId).filter(Boolean))]
      if (assessmentIds.length > 0) {
        const leads = await prisma.leadSubmission.findMany({
          where: { assessmentId: { in: assessmentIds } },
          select: { id: true, assessmentId: true }
        })
        leadByAssessment = Object.fromEntries(leads.map((l: any) => [l.assessmentId, l.id]))
      }
    } catch (_) { /* ignore */ }
    // Collapse to a single upcoming consult per case. Older data may contain
    // several SCHEDULED appointments for the same assessment (before scheduling
    // was made idempotent), which otherwise rendered the same case's appointment
    // card multiple times. upcomingAppointments is ordered by scheduledAt asc, so
    // the first entry per assessment is the soonest.
    const seenConsultAssessmentIds = new Set<string>()
    const upcomingConsults = upcomingAppointments
      .filter((a: any) => {
        const key = a.assessmentId || a.id
        if (seenConsultAssessmentIds.has(key)) return false
        seenConsultAssessmentIds.add(key)
        return true
      })
      .map((a: any) => ({
        id: a.id,
        leadId: leadByAssessment[a.assessmentId],
        scheduledAt: a.scheduledAt,
        type: a.type,
        duration: a.duration,
        status: a.status,
        assessmentId: a.assessmentId,
        plaintiffName: a.assessment?.user ? `${a.assessment.user.firstName || ''} ${a.assessment.user.lastName || ''}`.trim() || '—' : '—',
        claimType: a.assessment?.claimType || '—'
      }))

    // Messaging counts per lead (chat room by assessmentId + attorneyId)
    let messagingByLead: Record<string, { unreadCount: number; totalCount: number; lastMessageAt?: Date; awaitingReply: boolean }> = {}
    try {
      const assessmentIds = (recentLeads || []).map((l: any) => l.assessmentId).filter(Boolean)
      const chatRooms = assessmentIds.length > 0
        ? await prisma.chatRoom.findMany({
            where: { attorneyId, assessmentId: { in: assessmentIds } },
            include: {
              messages: {
                where: { senderType: 'user' },
                select: { isRead: true, createdAt: true }
              }
            }
          })
        : []
      const roomIds = chatRooms.map((room: any) => room.id)
      const attorneyMessages = roomIds.length > 0
        ? await prisma.message.findMany({
            where: { chatRoomId: { in: roomIds }, senderType: 'attorney' },
            select: { chatRoomId: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
          })
        : []
      const lastAttorneyMessageByRoom = attorneyMessages.reduce<Record<string, Date>>((acc, message: any) => {
        if (!acc[message.chatRoomId]) {
          acc[message.chatRoomId] = message.createdAt
        }
        return acc
      }, {})
      for (const room of chatRooms) {
        const aid = room.assessmentId
        if (!aid) continue
        const unread = room.messages.filter((m: any) => !m.isRead).length
        const lastUserMsg = [...room.messages].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        const lastAttorneyMsgAt = lastAttorneyMessageByRoom[room.id]
        const awaitingReply = lastUserMsg && (!lastAttorneyMsgAt || new Date(lastUserMsg.createdAt) > new Date(lastAttorneyMsgAt))
        messagingByLead[aid] = {
          unreadCount: unread,
          totalCount: room.messages.length,
          lastMessageAt: room.lastMessageAt || undefined,
          awaitingReply: !!awaitingReply
        }
      }
    } catch (msgErr: any) {
      logger.warn('Messaging counts query failed', { error: msgErr?.message })
    }

    const matchingRules = await getMatchingRules()
    const responseDeadlineMinutes = getAttorneyResponseDeadlineMinutes(matchingRules)
    const responseDeadlineLabel = formatAttorneyResponseDeadline(responseDeadlineMinutes)

    // Augment recentLeads with messaging and attorney offer deadline metadata
    const recentLeadsWithMessaging = (recentLeads || []).map((l: any) => {
      const msg = messagingByLead[l.assessmentId] || { unreadCount: 0, totalCount: 0, awaitingReply: false }
      const intro = l.assessment?.introductions?.[0]
      const requestedAt = intro?.requestedAt ? new Date(intro.requestedAt) : null
      const expiresAt = requestedAt
        ? new Date(requestedAt.getTime() + responseDeadlineMinutes * 60 * 1000)
        : null
      const pricingClaimType = getPricingClaimType(l.assessment)
      const pricingTier = getCaseRoutingPricingForClaimType(matchingRules, pricingClaimType)
      return sanitizeLeadForAttorney({
        ...l,
        messaging: msg,
        routingPricing: pricingTier
          ? {
              tierId: pricingTier.id,
              tierLabel: pricingTier.label,
              priceCents: pricingTier.priceCents,
              claimType: pricingClaimType,
              description: pricingTier.description,
            }
          : null,
        responseDeadlineMinutes,
        responseDeadlineLabel,
        offerRequestedAt: requestedAt?.toISOString?.() || null,
        offerExpiresAt: expiresAt?.toISOString?.() || null,
        offerStatus: intro?.status || null,
      })
    })

    const workQueueData = await buildAttorneyWorkQueue({
      attorneyId,
      leads: recentLeadsWithMessaging,
      upcomingConsults,
      messagingByAssessmentId: messagingByLead,
      prisma,
    })

    // Messaging summary for dashboard card
    const messagingSummary = {
      unreadCount: Object.values(messagingByLead).reduce((s, m) => s + m.unreadCount, 0),
      awaitingResponseCount: Object.values(messagingByLead).filter(m => m.awaitingReply).length
    }

    // Pipeline message counts (new messages in each stage)
    const pipelineMessageCounts: Record<string, number> = {
      matched: matched.filter((l: any) => (messagingByLead[l.assessmentId]?.unreadCount || 0) > 0).length,
      accepted: accepted.filter((l: any) => (messagingByLead[l.assessmentId]?.unreadCount || 0) > 0).length,
      contacted: contacted.filter((l: any) => (messagingByLead[l.assessmentId]?.unreadCount || 0) > 0).length,
      consultScheduled: consultScheduled.filter((l: any) => (messagingByLead[l.assessmentId]?.unreadCount || 0) > 0).length,
      retained: retained.filter((l: any) => (messagingByLead[l.assessmentId]?.unreadCount || 0) > 0).length,
      closed: closed.filter((l: any) => (messagingByLead[l.assessmentId]?.unreadCount || 0) > 0).length
    }

    // Recent contacts for dashboard widget
    let recentContacts: Array<{ id: string; leadId: string; contactType: string; contactMethod?: string; completedAt?: string; plaintiffName: string; claimType: string }> = []
    try {
      const contacts = await prisma.leadContact.findMany({
        where: { attorneyId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          lead: {
            include: {
              assessment: {
                include: {
                  user: { select: { firstName: true, lastName: true } }
                }
              }
            }
          }
        }
      })
      recentContacts = contacts.map((c: any) => ({
        id: c.id,
        leadId: c.leadId,
        contactType: c.contactType,
        contactMethod: c.contactMethod || undefined,
        completedAt: (c.completedAt || c.createdAt) ? new Date(c.completedAt || c.createdAt).toISOString() : undefined,
        plaintiffName: c.lead?.assessment?.user
          ? `${c.lead.assessment.user.firstName || ''} ${c.lead.assessment.user.lastName || ''}`.trim() || '—'
          : '—',
        claimType: c.lead?.assessment?.claimType || '—'
      }))
    } catch (contactErr: any) {
      logger.warn('Recent contacts query failed', { error: contactErr?.message })
    }

    // Case contacts count (people associated with cases)
    let caseContactsCount = 0
    try {
      caseContactsCount = await prisma.caseContact.count({
        where: { attorneyId }
      })
    } catch (caseContactErr: any) {
      logger.warn('Case contacts count failed', { error: caseContactErr?.message })
    }

    let importedCaseManagement = {
      importedCases: 0,
      pendingImports: 0,
      latestImportAt: null as string | null,
      bySource: {} as Record<string, number>
    }
    try {
      const importSources = ['filevine', 'needles', 'litify', 'spreadsheet']
      const importedRequests = await prisma.caseIntakeRequest.findMany({
        where: {
          attorneyId,
          source: { in: importSources }
        },
        select: {
          source: true,
          status: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      })
      importedCaseManagement = importedRequests.reduce((summary, request) => {
        const source = request.source || 'unknown'
        summary.importedCases += 1
        summary.bySource[source] = (summary.bySource[source] || 0) + 1
        if (request.status !== 'completed' && request.status !== 'created') {
          summary.pendingImports += 1
        }
        if (!summary.latestImportAt && request.createdAt) {
          summary.latestImportAt = request.createdAt.toISOString()
        }
        return summary
      }, importedCaseManagement)
    } catch (importCountErr: any) {
      logger.warn('Imported case management summary failed', { error: importCountErr?.message })
    }

    // Quick action counts (for attorney's cases)
    const assessmentIds = [...new Set((allLeadsForPipeline || []).map((l: any) => l.assessmentId).filter(Boolean))]
    const leadByAssessmentId = new Map(
      (allLeadsForPipeline || [])
        .filter((lead: any) => lead?.assessmentId)
        .map((lead: any) => [lead.assessmentId, lead]),
    )
    let tasksCount = 0
    let timeEntriesCount = 0
    let documentsCount = 0
    let notesCount = 0
    let invoicesCount = 0
    let expensesCount = 0
    let documentRequestsCount = 0
    try {
      if (assessmentIds.length > 0) {
        const [tasks, timeEntries, docs, notes, invoices, expenses] = await Promise.all([
          prisma.caseTask.count({ where: { assessmentId: { in: assessmentIds }, taskType: { not: 'time_entry' } } }),
          prisma.caseTask.count({ where: { assessmentId: { in: assessmentIds }, taskType: 'time_entry' } }),
          prisma.evidenceFile.count({ where: { assessmentId: { in: assessmentIds } } }),
          prisma.caseNote.count({ where: { assessmentId: { in: assessmentIds } } }),
          prisma.billingInvoice.count({ where: { assessmentId: { in: assessmentIds } } }),
          prisma.lienHolder.count({ where: { assessmentId: { in: assessmentIds } } })
        ])
        tasksCount = tasks
        timeEntriesCount = timeEntries
        documentsCount = docs
        notesCount = notes
        invoicesCount = invoices
        expensesCount = expenses
      }
      documentRequestsCount = await prisma.documentRequest.count({
        where: { attorneyId, status: 'pending' }
      })
    } catch (countErr: any) {
      logger.warn('Quick action counts failed', { error: countErr?.message })
    }

    let automationFeed: any[] = []
    try {
      if (assessmentIds.length > 0) {
        const reminders = await prisma.caseReminder.findMany({
          where: {
            assessmentId: { in: assessmentIds },
            status: 'scheduled',
            message: { startsWith: '[Readiness][' },
          },
          orderBy: [
            { dueAt: 'asc' },
            { createdAt: 'desc' },
          ],
          take: 20,
        })
        const reminderIds = reminders.map((reminder) => reminder.id)
        const auditEventsByReminderId = new Map<string, Array<{ action: string; createdAt: Date }>>()
        if (reminderIds.length > 0) {
          const automationAuditLogs = await prisma.auditLog.findMany({
            where: {
              entityType: 'automation_feed',
              entityId: { in: reminderIds },
            },
            orderBy: { createdAt: 'asc' },
          })
          for (const log of automationAuditLogs) {
            const entityId = log.entityId || ''
            if (!entityId) continue
            const events = auditEventsByReminderId.get(entityId) || []
            events.push({
              action: log.action,
              createdAt: log.createdAt,
            })
            auditEventsByReminderId.set(entityId, events)
          }
        }
        automationFeed = reminders
          .map((reminder) => parseReadinessReminder(reminder as any, leadByAssessmentId, auditEventsByReminderId))
          .filter(Boolean)
      }
    } catch (automationErr: any) {
      logger.warn('Automation feed failed', { error: automationErr?.message })
    }

    // Build response safely
    const response = {
      dashboard: {
        ...dashboard,
        feesCollectedFromPayments,
        totalPlatformSpend,
        totalLeadsReceived
      },
      recentLeads: workQueueData.leadsWithReadiness,
      messagingSummary,
      pipelineMessageCounts,
      qualityMetrics: qualityMetrics || {
        totalLeads: 0,
        averageViability: 0,
        exclusiveLeads: 0,
        hotLeads: 0,
        evidenceComplete: 0
      },
      urgentLeads: urgentLeads || [],
      analytics: {
        conversionRate,
        roi: totalPlatformSpend > 0 ?
          (feesCollectedFromPayments / totalPlatformSpend) : 0,
        averageFee: acceptedCount > 0 ?
          feesCollectedFromPayments / acceptedCount : 0
      },
      activeCases: {
        matched: matched.length,
        accepted: accepted.length,
        contacted: contacted.length,
        consultScheduled: consultScheduled.length,
        retained: retained.length,
        closed: closed.length
      },
      pipelineValue,
      retainedValue,
      pipelineAlerts: {
        matchedExpiringSoon,
        acceptedNeedsFollowUp,
        consultToday
      },
      casesRequiringAttention,
      upcomingConsults,
      needsActionToday: workQueueData.needsActionToday,
      dailyQueueSummary: workQueueData.dailyQueueSummary,
      automationFeed,
      pipelinePreviews: {
        matched: matched.slice(0, 3).map((l: any) => ({ id: l.id, claimType: l.assessment?.claimType, venue: [l.assessment?.venueCounty, l.assessment?.venueState].filter(Boolean).join(', '), estimatedValue: getLeadMedian(l), viability: l.viabilityScore })),
        accepted: accepted.slice(0, 3).map((l: any) => ({ id: l.id, claimType: l.assessment?.claimType, venue: [l.assessment?.venueCounty, l.assessment?.venueState].filter(Boolean).join(', '), estimatedValue: getLeadMedian(l), viability: l.viabilityScore })),
        contacted: contacted.slice(0, 3).map((l: any) => ({ id: l.id, claimType: l.assessment?.claimType, venue: [l.assessment?.venueCounty, l.assessment?.venueState].filter(Boolean).join(', '), estimatedValue: getLeadMedian(l), viability: l.viabilityScore })),
        consultScheduled: consultScheduled.slice(0, 3).map((l: any) => ({ id: l.id, claimType: l.assessment?.claimType, venue: [l.assessment?.venueCounty, l.assessment?.venueState].filter(Boolean).join(', ') })),
        retained: retained.slice(0, 3).map((l: any) => ({ id: l.id, claimType: l.assessment?.claimType, estimatedValue: getLeadMedian(l) }))
      },
      funnel: {
        matched: funnelMatched,
        accepted: funnelAccepted,
        contacted: funnelContacted,
        consultScheduled: funnelConsultScheduled,
        retained: funnelRetained,
        closed: funnelClosed
      },
      newCaseMatches: matched.slice(0, 10),
      topCaseToday,
      recentContacts,
      caseContactsCount,
      importedCaseManagement,
      quickActionCounts: {
        tasks: tasksCount,
        timeEntries: timeEntriesCount,
        documents: documentsCount,
        notes: notesCount,
        invoices: invoicesCount,
        expenses: expensesCount,
        documentRequests: documentRequestsCount,
        events: (upcomingConsults || []).length
      }
    }

    logger.info('Dashboard response prepared', { 
      attorneyId,
      dashboardId: dashboard.id,
      leadsCount: response.recentLeads.length
    })

    res.json(response)
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    const errorStack = error?.stack
    
    logger.error('Failed to get attorney dashboard', { 
      error: errorMessage, 
      stack: errorStack,
      userId: req.user?.id,
      userEmail: req.user?.email,
      errorType: error?.constructor?.name,
      errorCode: error?.code,
      errorName: error?.name
    })
    
    // Log the full error for debugging
    console.error('Dashboard error details:', {
      message: errorMessage,
      stack: errorStack,
      code: error?.code,
      name: error?.name,
      cause: error?.cause
    })
    
    // Ensure we always send a response
    if (!res.headersSent) {
      // Always include details in development, or if NODE_ENV is not production
      const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
      res.status(500).json({ 
        error: 'Failed to get dashboard data',
        details: isDevelopment ? errorMessage : undefined,
        errorType: isDevelopment ? error?.constructor?.name : undefined,
        errorCode: isDevelopment ? error?.code : undefined,
        requestId: req.id
      })
    }
  }
})

// Attorney calendar: consultations / meetings linked to cases (date range for mobile & web)
router.get('/appointments', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAttorneyFromReq(req)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { attorney } = auth

    const now = new Date()
    let from = req.query.from ? new Date(String(req.query.from)) : new Date(now.getFullYear(), now.getMonth(), 1)
    let to = req.query.to
      ? new Date(String(req.query.to))
      : new Date(now.getFullYear(), now.getMonth() + 3, 0, 23, 59, 59, 999)
    if (Number.isNaN(from.getTime())) from = new Date(now.getFullYear(), now.getMonth(), 1)
    if (Number.isNaN(to.getTime())) to = new Date(now.getFullYear(), now.getMonth() + 3, 0, 23, 59, 59, 999)
    if (to < from) {
      const swap = from
      from = to
      to = swap
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        attorneyId: attorney.id,
        assessmentId: { not: null },
        scheduledAt: { gte: from, lte: to },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'] },
      },
      select: {
        id: true,
        assessmentId: true,
        scheduledAt: true,
        type: true,
        duration: true,
        status: true,
        notes: true,
        meetingUrl: true,
        location: true,
        phoneNumber: true,
        assessment: {
          select: {
            claimType: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    })

    const assessmentIds = [...new Set(appointments.map((a) => a.assessmentId).filter(Boolean))] as string[]
    let leadByAssessment: Record<string, string> = {}
    if (assessmentIds.length > 0) {
      const leads = await prisma.leadSubmission.findMany({
        where: { assessmentId: { in: assessmentIds } },
        select: { id: true, assessmentId: true },
      })
      leadByAssessment = Object.fromEntries(leads.map((l) => [l.assessmentId, l.id]))
    }

    const events = appointments.map((a) => ({
      id: a.id,
      leadId: a.assessmentId ? leadByAssessment[a.assessmentId] : undefined,
      scheduledAt: a.scheduledAt,
      type: a.type,
      duration: a.duration,
      status: a.status,
      assessmentId: a.assessmentId,
      notes: a.notes,
      meetingUrl: a.meetingUrl,
      location: a.location,
      phoneNumber: a.phoneNumber,
      plaintiffName: a.assessment?.user
        ? `${a.assessment.user.firstName || ''} ${a.assessment.user.lastName || ''}`.trim() || '—'
        : '—',
      claimType: a.assessment?.claimType || '—',
    }))

    res.json({ from: from.toISOString(), to: to.toISOString(), events })
  } catch (error: any) {
    logger.error('Failed to get attorney appointments', { error: error.message })
    res.status(500).json({ error: 'Failed to load appointments' })
  }
})

router.get('/profile/preferences', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAttorneyFromReq(req)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }

    const attorney = await prisma.attorney.findUnique({
      where: { id: auth.attorney.id },
      include: {
        attorneyProfile: true,
        lawFirm: { select: { state: true } }
      }
    })

    if (!attorney) {
      return res.status(404).json({ error: 'Attorney profile not found' })
    }

    const venueStates = extractAttorneyVenueStates(attorney)
    res.json({
      attorneyId: attorney.id,
      defaultVenueState: venueStates[0] || 'CA',
      venueStates: venueStates.length > 0 ? venueStates : ['CA']
    })
  } catch (error: any) {
    logger.error('Failed to load attorney profile preferences', { error: error.message, userId: req.user?.id })
    res.status(500).json({ error: 'Failed to load attorney preferences' })
  }
})

router.patch('/appointments/:appointmentId', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAttorneyFromReq(req)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }

    const { appointmentId } = req.params
    const { scheduledAt, type, duration, notes, status } = req.body || {}
    const existing = await prisma.appointment.findFirst({
      where: { id: appointmentId, attorneyId: auth.attorney.id },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        assessment: { select: { claimType: true } }
      }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' })
    }

    const nextScheduledAt = scheduledAt ? new Date(String(scheduledAt)) : existing.scheduledAt
    if (Number.isNaN(nextScheduledAt.getTime())) {
      return res.status(400).json({ error: 'Invalid appointment time' })
    }

    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        scheduledAt: nextScheduledAt,
        type: typeof type === 'string' ? type : existing.type,
        duration: Number.isFinite(Number(duration)) ? Number(duration) : existing.duration,
        notes: typeof notes === 'string' ? notes : existing.notes,
        status: typeof status === 'string' ? status : existing.status
      }
    })

    if (existing.user?.email) {
      const attorneyName = auth.attorney.name || 'Your attorney'
      const dateText = appointment.scheduledAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      const timeText = appointment.scheduledAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      await createNotification(
        existing.user.email,
        'Your consultation was updated',
        `Hi${existing.user.firstName ? ` ${existing.user.firstName}` : ''},\n\n${attorneyName} updated your consultation.\n\nDate: ${dateText}\nTime: ${timeText}\nType: ${appointment.type}\n\n${appointment.notes ? `Notes: ${appointment.notes}\n\n` : ''}Best regards,\nClearCaseIQ`,
        {
          appointmentId: appointment.id,
          assessmentId: appointment.assessmentId,
          scheduledAt: appointment.scheduledAt.toISOString()
        },
        {
          replyTo: auth.attorney.email || null,
          fromName: auth.attorney.name || null,
          assessmentId: appointment.assessmentId,
          role: 'plaintiff',
        }
      )
    }

    res.json(appointment)
  } catch (error: any) {
    logger.error('Failed to update attorney appointment', { error: error.message, appointmentId: req.params.appointmentId })
    res.status(500).json({ error: 'Failed to update appointment' })
  }
})

router.post('/appointments/:appointmentId/cancel', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAttorneyFromReq(req)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }

    const { appointmentId } = req.params
    const { reason } = req.body || {}
    const existing = await prisma.appointment.findFirst({
      where: { id: appointmentId, attorneyId: auth.attorney.id },
      include: { user: { select: { email: true, firstName: true } } }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' })
    }

    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${existing.notes ? `${existing.notes}\n\n` : ''}Cancelled: ${reason}` : existing.notes
      }
    })

    if (existing.user?.email) {
      await createNotification(
        existing.user.email,
        'Your consultation was cancelled',
        `Hi${existing.user.firstName ? ` ${existing.user.firstName}` : ''},\n\n${auth.attorney.name || 'Your attorney'} cancelled your consultation.${reason ? `\n\nReason: ${reason}` : ''}\n\nBest regards,\nClearCaseIQ`,
        {
          appointmentId: appointment.id,
          assessmentId: appointment.assessmentId,
          status: 'CANCELLED'
        },
        {
          replyTo: auth.attorney.email || null,
          fromName: auth.attorney.name || null,
          assessmentId: appointment.assessmentId,
          role: 'plaintiff',
        }
      )
    }

    res.json(appointment)
  } catch (error: any) {
    logger.error('Failed to cancel attorney appointment', { error: error.message, appointmentId: req.params.appointmentId })
    res.status(500).json({ error: 'Failed to cancel appointment' })
  }
})

// Register Expo push token for the signed-in attorney user (same User row as JWT).
router.post('/push/register', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const { expoPushToken, platform } = req.body || {}
    if (!expoPushToken || typeof expoPushToken !== 'string') {
      return res.status(400).json({ error: 'expoPushToken is required' })
    }
    await prisma.attorneyPushDevice.upsert({
      where: { expoPushToken },
      create: { userId, expoPushToken, platform: typeof platform === 'string' ? platform : null },
      update: { userId, platform: typeof platform === 'string' ? platform : null },
    })
    res.json({ ok: true })
  } catch (error: any) {
    const msg = error?.message || String(error)
    logger.error('Push register failed', { error: msg, code: error?.code })
    const missingTable =
      /attorney_push_devices|Unknown table|'attorney_push_devices'|doesn't exist|P2021/i.test(msg)
    res.status(500).json({
      error: 'Failed to register push token',
      code: missingTable ? 'MIGRATION_REQUIRED' : undefined,
      detail:
        missingTable
          ? 'Run DB migrations (attorney_push_devices). From repo: cd api && pnpm exec prisma migrate deploy'
          : process.env.NODE_ENV !== 'production'
            ? msg
            : undefined,
    })
  }
})

router.delete('/push/register', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const { expoPushToken } = req.body || {}
    if (!expoPushToken || typeof expoPushToken !== 'string') {
      return res.status(400).json({ error: 'expoPushToken is required' })
    }
    await prisma.attorneyPushDevice.deleteMany({
      where: { userId, expoPushToken },
    })
    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Push unregister failed', { error: error.message })
    res.status(500).json({ error: 'Failed to unregister push token' })
  }
})

// Open tasks across all leads the attorney can access (mobile Today / Overdue).
router.get('/tasks/summary', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAttorneyFromReq(req)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const { attorney } = auth

    const assignedLeads = await prisma.leadSubmission.findMany({
      where: { assignedAttorneyId: attorney.id },
      select: { id: true, assessmentId: true, assessment: { select: { claimType: true } } },
    })
    const introAssessments = await prisma.introduction.findMany({
      where: { attorneyId: attorney.id },
      select: { assessmentId: true },
    })
    const introAssessIds = [...new Set(introAssessments.map((i) => i.assessmentId))]
    const introLeads =
      introAssessIds.length > 0
        ? await prisma.leadSubmission.findMany({
            where: { assessmentId: { in: introAssessIds } },
            select: { id: true, assessmentId: true, assessment: { select: { claimType: true } } },
          })
        : []

    const byAssessment = new Map<string, { leadId: string; claimType?: string | null }>()
    for (const l of assignedLeads) {
      byAssessment.set(l.assessmentId, { leadId: l.id, claimType: l.assessment?.claimType })
    }
    for (const l of introLeads) {
      if (!byAssessment.has(l.assessmentId)) {
        byAssessment.set(l.assessmentId, { leadId: l.id, claimType: l.assessment?.claimType })
      }
    }

    const assessmentIds = [...byAssessment.keys()]
    if (assessmentIds.length === 0) {
      return res.json({ overdue: [], today: [], upcoming: [], noDueDate: [] })
    }

    const tasks = await prisma.caseTask.findMany({
      where: {
        assessmentId: { in: assessmentIds },
        taskType: { not: 'time_entry' },
        NOT: { status: { in: ['completed', 'done'] } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 300,
    })

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    type TaskRow = {
      id: string
      title: string
      dueDate: string | null
      status: string
      priority: string
      taskType: string
      assessmentId: string
      leadId: string
      claimType: string | null | undefined
    }

    const mapTask = (t: (typeof tasks)[0]): TaskRow | null => {
      const meta = byAssessment.get(t.assessmentId)
      if (!meta) return null
      return {
        id: t.id,
        title: t.title,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        status: t.status,
        priority: t.priority,
        taskType: t.taskType,
        assessmentId: t.assessmentId,
        leadId: meta.leadId,
        claimType: meta.claimType,
      }
    }

    const overdue: TaskRow[] = []
    const today: TaskRow[] = []
    const upcoming: TaskRow[] = []
    const noDueDate: TaskRow[] = []

    for (const t of tasks) {
      const row = mapTask(t)
      if (!row) continue
      if (!t.dueDate) {
        noDueDate.push(row)
        continue
      }
      const d = t.dueDate.getTime()
      if (d < todayStart.getTime()) overdue.push(row)
      else if (d >= todayStart.getTime() && d < todayEnd.getTime()) today.push(row)
      else upcoming.push(row)
    }

    res.json({ overdue, today, upcoming, noDueDate })
  } catch (error: any) {
    logger.error('Failed to load task summary', { error: error.message })
    res.status(500).json({ error: 'Failed to load tasks' })
  }
})

// Pending document requests for this attorney (mobile status screen).
router.get('/document-requests', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAttorneyFromReq(req)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const { attorney } = auth

    const rows = await prisma.documentRequest.findMany({
      where: { attorneyId: attorney.id },
      select: {
        id: true,
        leadId: true,
        status: true,
        requestedDocs: true,
        customMessage: true,
        uploadLink: true,
        targetType: true,
        recipientName: true,
        recipientRole: true,
        origin: true,
        attorneyViewedAt: true,
        lastNudgeAt: true,
        createdAt: true,
        lead: {
          select: {
            id: true,
            assessment: { select: { claimType: true } },
          },
        },
        _count: { select: { externalUploads: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const parsed = rows.map((r) => {
      let requested: string[] = []
      try {
        requested = JSON.parse(r.requestedDocs || '[]')
      } catch {
        requested = []
      }
      return {
        id: r.id,
        leadId: r.leadId,
        status: r.status,
        requestedDocs: requested,
        customMessage: r.customMessage,
        uploadLink: r.uploadLink,
        targetType: r.targetType,
        recipientName: r.recipientName,
        recipientRole: r.recipientRole,
        origin: r.origin,
        uploadedCount: r._count?.externalUploads || 0,
        attorneyViewedAt: r.attorneyViewedAt,
        lastNudgeAt: r.lastNudgeAt,
        createdAt: r.createdAt,
        claimType: r.lead?.assessment?.claimType || null,
      }
    })

    res.json(parsed)
  } catch (error: any) {
    logger.error('Failed to list document requests', { error: error.message })
    res.status(500).json({ error: 'Failed to load document requests' })
  }
})

router.patch('/document-requests/:requestId/viewed', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAttorneyFromReq(req)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const { requestId } = req.params
    const updated = await prisma.documentRequest.updateMany({
      where: { id: requestId, attorneyId: auth.attorney.id },
      data: { attorneyViewedAt: new Date() },
    })
    if (updated.count === 0) return res.status(404).json({ error: 'Document request not found' })
    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Failed to mark document request viewed', { error: error.message })
    res.status(500).json({ error: 'Failed to update' })
  }
})

router.post('/document-requests/:requestId/nudge', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAttorneyFromReq(req)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const { requestId } = req.params
    const doc = await prisma.documentRequest.findFirst({
      where: { id: requestId, attorneyId: auth.attorney.id },
      select: {
        id: true,
        status: true,
        lastNudgeAt: true,
        uploadLink: true,
        leadId: true,
        targetType: true,
        recipientName: true,
        recipientEmail: true,
        lead: {
          select: {
            assessmentId: true,
            assessment: {
              select: {
                facts: true,
                user: { select: { id: true, email: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    })
    if (!doc) return res.status(404).json({ error: 'Document request not found' })
    if (doc.status === 'completed') {
      return res.status(400).json({ error: 'This request is already completed.' })
    }
    if (doc.lastNudgeAt) {
      const elapsed = Date.now() - doc.lastNudgeAt.getTime()
      if (elapsed < 24 * 60 * 60 * 1000) {
        return res.status(429).json({ error: 'You can send another reminder in 24 hours.' })
      }
    }

    // Opposing-party requests go to an external recipient with no platform account.
    if (doc.targetType === 'opposing_party') {
      if (!doc.recipientEmail) {
        return res.status(400).json({ error: 'No email on file for this recipient.' })
      }
      const attorneyName = auth.attorney.name || 'the attorney'
      const subject = 'Reminder: documents requested for a claim'
      const message = `Hello ${doc.recipientName || 'there'},\n\nThis is a reminder from ${attorneyName} regarding the documents previously requested. You can upload them securely here:\n\n${doc.uploadLink}\n\nThank you,\nClearCaseIQ`
      await createNotification(doc.recipientEmail, subject, message, {
        leadId: doc.leadId,
        assessmentId: doc.lead?.assessmentId ?? undefined,
        documentRequestId: doc.id,
        targetType: 'opposing_party',
        uploadLink: doc.uploadLink,
        nudge: true,
      }, {
        replyTo: auth.attorney.email || null,
        fromName: auth.attorney.name || null,
      })
      await prisma.documentRequest.update({
        where: { id: doc.id },
        data: { lastNudgeAt: new Date() },
      })
      return res.json({ ok: true })
    }

    const assessment = doc.lead?.assessment
    let plaintiffEmail = assessment?.user?.email
    if (!plaintiffEmail && assessment?.facts) {
      try {
        const facts = typeof assessment.facts === 'string' ? JSON.parse(assessment.facts) : assessment.facts
        plaintiffEmail = (facts as { plaintiffContext?: { email?: string } })?.plaintiffContext?.email
      } catch {
        /* ignore */
      }
    }
    if (!plaintiffEmail) {
      return res.status(400).json({ error: 'No email on file for this plaintiff.' })
    }

    const attorneyName = auth.attorney.name || 'Your attorney'
    const plaintiffName = assessment?.user?.firstName
      ? `${assessment.user.firstName} ${assessment.user.lastName || ''}`.trim()
      : 'there'
    const subject = 'Reminder: documents requested for your case'
    const message = `Hi ${plaintiffName},\n\nThis is a friendly reminder from ${attorneyName} to upload the documents we discussed. You can use your secure link:\n\n${doc.uploadLink}\n\nThank you,\nClearCaseIQ`

    await createNotification(plaintiffEmail, subject, message, {
      leadId: doc.leadId,
      assessmentId: doc.lead?.assessmentId ?? undefined,
      documentRequestId: doc.id,
      uploadLink: doc.uploadLink,
      nudge: true,
    }, {
      replyTo: auth.attorney.email || null,
      fromName: auth.attorney.name || null,
      userId: assessment?.user?.id ?? null,
      assessmentId: doc.lead?.assessmentId ?? null,
      role: 'plaintiff',
    })

    await prisma.documentRequest.update({
      where: { id: doc.id },
      data: { lastNudgeAt: new Date() },
    })

    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Document request nudge failed', { error: error.message })
    res.status(500).json({ error: 'Failed to send reminder' })
  }
})

// Get lead quality details for a specific lead
router.get('/leads/:leadId/quality', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAttorneyFromReq(req)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const attorneyId = auth.attorney.id

    const lead = await prisma.leadSubmission.findFirst({
      where: {
        id: leadId,
        OR: [
          { assignedAttorneyId: attorneyId },
          { assignmentType: 'shared' }
        ]
      },
      select: {
        id: true,
        assessmentId: true,
        status: true,
        submittedAt: true,
        updatedAt: true,
        lastContactAt: true,
        liabilityScore: true,
        causationScore: true,
        damagesScore: true,
        viabilityScore: true,
        isExclusive: true,
        sourceType: true,
        sourceDetails: true,
        hotnessLevel: true,
        evidenceChecklist: true,
        assessment: {
          select: {
            id: true,
            claimType: true,
            venueState: true,
            venueCounty: true,
            facts: true,
            files: {
              select: {
                originalName: true,
                mimetype: true,
                createdAt: true,
              },
            },
          },
        },
        conflictChecks: {
          where: { attorneyId },
          select: {
            id: true,
            attorneyId: true,
            leadId: true,
            conflictType: true,
            conflictDetails: true,
            riskLevel: true,
            isResolved: true,
            resolutionNotes: true,
            resolvedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        qualityReports: {
          select: {
            id: true,
            leadId: true,
            overallQuality: true,
            qualityScore: true,
            issues: true,
            isSpam: true,
            isDuplicate: true,
            reportedBy: true,
            reportReason: true,
            status: true,
            resolution: true,
            creditIssued: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' })
    }

    // Parse evidence checklist
    const evidenceChecklist = lead.evidenceChecklist ? JSON.parse(lead.evidenceChecklist) : {
      required: [
        { name: 'Police Report', uploaded: false, critical: true },
        { name: 'Medical Records', uploaded: false, critical: true },
        { name: 'Insurance Information', uploaded: false, critical: false },
        { name: 'Witness Statements', uploaded: false, critical: false }
      ],
      uploaded: lead.assessment.files.map(file => ({
        name: file.originalName,
        type: file.mimetype,
        uploadedAt: file.createdAt
      }))
    }

    // Calculate lead hotness
    const hoursSinceSubmission = Math.floor((Date.now() - lead.submittedAt.getTime()) / (1000 * 60 * 60))
    let hotnessLevel = 'cold'
    if (hoursSinceSubmission < 2) hotnessLevel = 'hot'
    else if (hoursSinceSubmission < 24) hotnessLevel = 'warm'

    // Get SOL information
    const facts = lead.assessment.facts ? JSON.parse(lead.assessment.facts) : {}
    const incidentDate = new Date(facts.incident?.date)
    const daysSinceIncident = Math.floor((Date.now() - incidentDate.getTime()) / (1000 * 60 * 60 * 24))
    const daysUntilSOL = 365 - daysSinceIncident // Simplified SOL calculation

    res.json({
      lead,
      qualityDetails: {
        viabilityBreakdown: {
          liability: lead.liabilityScore,
          causation: lead.causationScore,
          damages: lead.damagesScore,
          overall: lead.viabilityScore
        },
        evidenceChecklist,
        exclusivity: {
          isExclusive: lead.isExclusive,
          sourceType: lead.sourceType,
          sourceDetails: lead.sourceDetails ? JSON.parse(lead.sourceDetails) : null
        },
        hotness: {
          level: hotnessLevel,
          hoursSinceSubmission,
          lastContact: lead.lastContactAt
        },
        sol: {
          daysUntilExpiration: daysUntilSOL,
          isUrgent: daysUntilSOL < 90,
          incidentDate: incidentDate
        },
        conflicts: lead.conflictChecks,
        qualityReports: lead.qualityReports
      }
    })
  } catch (error: any) {
    logger.error('Failed to get lead quality details', { error: error.message })
    res.status(500).json({ error: 'Failed to get lead quality details' })
  }
})

// Update lead filters and preferences
router.put('/settings', authMiddleware, async (req: any, res) => {
  try {
    const attorneyId = req.user.id
    const { leadFilters, exclusivitySettings, pricingModel } = req.body

    const dashboard = await prisma.attorneyDashboard.upsert({
      where: { attorneyId },
      update: {
        leadFilters: leadFilters ? JSON.stringify(leadFilters) : undefined,
        exclusivitySettings: exclusivitySettings ? JSON.stringify(exclusivitySettings) : undefined,
        pricingModel
      },
      create: {
        attorneyId,
        leadFilters: leadFilters ? JSON.stringify(leadFilters) : null,
        exclusivitySettings: exclusivitySettings ? JSON.stringify(exclusivitySettings) : null,
        pricingModel: pricingModel || 'per_lead'
      }
    })

    res.json(dashboard)
  } catch (error: any) {
    logger.error('Failed to update attorney settings', { error: error.message })
    res.status(500).json({ error: 'Failed to update settings' })
  }
})

// Get filtered leads based on attorney preferences
router.get('/leads/filtered', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAttorneyFromReq(req)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const attorneyId = auth.attorney.id
    const { 
      caseType, 
      venueState, 
      venueCounty, 
      status,
      minDamages, 
      maxDamages, 
      language, 
      sourceType,
      hotnessLevel,
      isExclusive,
      page = 1,
      limit = 20
    } = req.query

    // Build query filters
    const whereClause: any = {
      OR: [
        { assignedAttorneyId: attorneyId },
        { assignmentType: 'shared' }
      ]
    }

    if (caseType) whereClause.assessment = { claimType: caseType }
    if (venueState) {
      whereClause.assessment = {
        ...whereClause.assessment,
        venueState
      }
    }
    if (venueCounty) {
      whereClause.assessment = {
        ...whereClause.assessment,
        venueCounty
      }
    }
    if (hotnessLevel) whereClause.hotnessLevel = hotnessLevel
    if (isExclusive !== undefined) whereClause.isExclusive = isExclusive === 'true'
    if (sourceType) whereClause.sourceType = sourceType
    if (status) {
      const requestedStatuses = String(status)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
      const activeAttorneyStatuses = ['accepted', 'contacted', 'consulted', 'retained']
      const statusValues = requestedStatuses.includes('accepted')
        ? Array.from(new Set([...requestedStatuses, ...activeAttorneyStatuses]))
        : requestedStatuses
      if (statusValues.length === 1) whereClause.status = statusValues[0]
      else if (statusValues.length > 1) whereClause.status = { in: statusValues }
    }

    const leads = await prisma.leadSubmission.findMany({
      where: whereClause,
      select: {
        id: true,
        assessmentId: true,
        assignedAttorneyId: true,
        assignmentType: true,
        status: true,
        submittedAt: true,
        updatedAt: true,
        lastContactAt: true,
        hotnessLevel: true,
        liabilityScore: true,
        causationScore: true,
        damagesScore: true,
        viabilityScore: true,
        isExclusive: true,
        sourceType: true,
        sourceDetails: true,
        evidenceChecklist: true,
        assessment: {
          select: {
            id: true,
            claimType: true,
            venueState: true,
            venueCounty: true,
            facts: true,
            files: {
              select: {
                originalName: true,
                mimetype: true,
                createdAt: true,
              },
            },
          },
        },
        assignedAttorney: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { hotnessLevel: 'desc' },
        { viabilityScore: 'desc' },
        { submittedAt: 'desc' }
      ],
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string)
    })

    // Filter by damages if specified (this would require additional assessment parsing)
    let filteredLeads = leads
    if (minDamages || maxDamages) {
      filteredLeads = leads.filter(lead => {
        const facts = JSON.parse(lead.assessment.facts)
        const medicalBills = facts.medicalBills || 0
        const lostWages = facts.lostWages || 0
        const totalDamages = medicalBills + lostWages

        if (minDamages && totalDamages < parseFloat(minDamages as string)) return false
        if (maxDamages && totalDamages > parseFloat(maxDamages as string)) return false
        return true
      })
    }

    res.json({
      leads: filteredLeads,
      totalCount: filteredLeads.length,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    })
  } catch (error: any) {
    logger.error('Failed to get filtered leads', { error: error.message })
    res.status(500).json({ error: 'Failed to get filtered leads' })
  }
})

// Lead contact and booking endpoints

// Create a contact attempt
router.post('/leads/:leadId/contact', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const { contactType, contactMethod, scheduledAt, notes } = req.body

    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const attorney = await prisma.attorney.findFirst({
      where: { email: req.user.email },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }

    const attorneyId = attorney.id

    const contact = await prisma.leadContact.create({
      data: {
        leadId,
        attorneyId,
        contactType,
        contactMethod,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        notes
      }
    })

    // Update lead last contact time and status
    await prisma.leadSubmission.update({
      where: { id: leadId },
      data: {
        lastContactAt: new Date(),
        status: contactType === 'consult' ? 'consulted' : 'contacted'
      }
    })

    // Send in-app message + notification to plaintiff for document_request, consult, sms, or email (messages)
    const notifyContactTypes = ['document_request', 'consult', 'sms', 'email']
    if (notifyContactTypes.includes(contactType)) {
      const lead = await prisma.leadSubmission.findUnique({
        where: { id: leadId },
        select: {
          assessmentId: true,
          assessment: {
            select: {
              userId: true,
              facts: true,
              user: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
          },
        },
      })
      let plaintiffEmail = lead?.assessment?.user?.email
      if (!plaintiffEmail && lead?.assessment?.facts) {
        try {
          const facts = typeof lead.assessment.facts === 'string' ? JSON.parse(lead.assessment.facts) : lead.assessment.facts
          plaintiffEmail = (facts.plaintiffContext as any)?.email
        } catch {}
      }
      const plaintiffUserId = lead?.assessment?.userId ?? lead?.assessment?.user?.id
      const leadAssessmentId = lead?.assessmentId ?? null
      const attorneyName = attorney.name || 'Your attorney'
      const plaintiffName = lead?.assessment?.user?.firstName
        ? `${lead.assessment.user.firstName} ${lead.assessment.user.lastName || ''}`.trim()
        : 'there'

      // In-app ChatRoom message (stays in platform)
      if (plaintiffUserId && (contactType === 'sms' || contactType === 'email')) {
        try {
          let chatRoom = await prisma.chatRoom.findUnique({
            where: {
              userId_attorneyId: { userId: plaintiffUserId, attorneyId }
            },
            select: { id: true },
          })
          if (!chatRoom) {
            chatRoom = await prisma.chatRoom.create({
              data: {
                userId: plaintiffUserId,
                attorneyId,
                assessmentId: leadAssessmentId
              }
            })
          }
          const messageContent = notes || 'Your attorney sent you a message.'
          await prisma.message.create({
            data: {
              chatRoomId: chatRoom.id,
              senderId: attorney.id,
              senderType: 'attorney',
              content: messageContent,
              messageType: 'text'
            }
          })
          await prisma.chatRoom.update({
            where: { id: chatRoom.id },
            data: { lastMessageAt: new Date() }
          })
        } catch (chatErr: any) {
          logger.error('Failed to create in-app chat message', { error: chatErr.message })
        }
      }
      // Document/consult: also add to chat room so plaintiff sees in-app
      if (plaintiffUserId && (contactType === 'document_request' || contactType === 'consult')) {
        try {
          let chatRoom = await prisma.chatRoom.findUnique({
            where: {
              userId_attorneyId: { userId: plaintiffUserId, attorneyId }
            },
            select: { id: true },
          })
          if (!chatRoom) {
            chatRoom = await prisma.chatRoom.create({
              data: {
                userId: plaintiffUserId,
                attorneyId,
                assessmentId: leadAssessmentId
              }
            })
          }
          const msg = contactType === 'document_request'
            ? `${attorneyName} has requested that you upload additional documents for your case.`
            : `${attorneyName} would like to schedule a consultation with you.`
          await prisma.message.create({
            data: {
              chatRoomId: chatRoom.id,
              senderId: attorney.id,
              senderType: 'attorney',
              content: msg,
              messageType: 'text'
            }
          })
          await prisma.chatRoom.update({
            where: { id: chatRoom.id },
            data: { lastMessageAt: new Date() }
          })
        } catch (chatErr: any) {
          logger.error('Failed to create in-app chat message', { error: chatErr.message })
        }
      }

      // Notification (for email alerts - kept for backwards compat)
      if (plaintiffEmail) {
        let subject: string
        let message: string
        if (contactType === 'document_request') {
          subject = 'Document Request from Your Attorney'
          message = `Hi ${plaintiffName},\n\n${attorneyName} has requested that you upload additional documents for your case. Please log in to your account to view the request and upload the requested documents.\n\nBest regards,\nClearCaseIQ`
        } else if (contactType === 'consult') {
          subject = 'Consultation Scheduling Request from Your Attorney'
          message = `Hi ${plaintiffName},\n\n${attorneyName} would like to schedule a consultation with you. Please log in to your account to view the request and select an available time.\n\nBest regards,\nClearCaseIQ`
        } else {
          subject = `Message from ${attorneyName}`
          message = notes
            ? `Hi ${plaintiffName},\n\n${attorneyName} sent you a message:\n\n${notes}\n\nBest regards,\nClearCaseIQ`
            : `Hi ${plaintiffName},\n\n${attorneyName} sent you a message. Please log in to your dashboard to view it.\n\nBest regards,\nClearCaseIQ`
        }
        await createNotification(plaintiffEmail, subject, message, {
          leadId,
          assessmentId: leadAssessmentId,
          contactType,
          contactId: contact.id
        }, {
          replyTo: attorney.email || null,
          fromName: attorney.name || null,
          userId: plaintiffUserId || null,
          assessmentId: leadAssessmentId,
          role: 'plaintiff',
        })
      }
    }

    res.json(contact)
  } catch (error: any) {
    logger.error('Failed to create contact attempt', { error: error.message })
    res.status(500).json({ error: 'Failed to create contact attempt' })
  }
})

// Create document request (structured workflow)
router.post('/leads/:leadId/document-request', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const { requestedDocs = [], customMessage, sendUploadLinkOnly } = req.body

    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const { lead, attorney } = auth

    const docs = sendUploadLinkOnly ? [] : (Array.isArray(requestedDocs) ? requestedDocs : [])
    const secureToken = crypto.randomUUID()
    const baseUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000'
    const uploadLink = `${baseUrl}/evidence-upload/${lead.assessmentId}?token=${secureToken}`

    const docRequest = await prisma.documentRequest.create({
      data: {
        leadId,
        attorneyId: attorney.id,
        requestedDocs: JSON.stringify(docs),
        customMessage: customMessage || null,
        secureToken,
        uploadLink,
        status: 'pending'
      }
    })

    // Update lead last contact
    await prisma.leadSubmission.update({
      where: { id: leadId },
      data: { lastContactAt: new Date() }
    })

    // Notify plaintiff + in-app message
    const assessment = await prisma.assessment.findUnique({
      where: { id: lead.assessmentId },
      select: {
        userId: true,
        facts: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    })
    let plaintiffEmail = assessment?.user?.email
    if (!plaintiffEmail && assessment?.facts) {
      try {
        const facts = typeof assessment.facts === 'string' ? JSON.parse(assessment.facts) : assessment.facts
        plaintiffEmail = (facts.plaintiffContext as any)?.email
      } catch {}
    }
    const attorneyName = attorney.name || 'Your attorney'
    const plaintiffName = assessment?.user?.firstName
      ? `${assessment!.user!.firstName} ${assessment!.user!.lastName || ''}`.trim()
      : 'there'
    const docLabels: Record<string, string> = {
      police_report: 'Police report',
      medical_records: 'Medical records',
      injury_photos: 'Injury photos',
      wage_loss: 'Wage loss documentation',
      insurance: 'Insurance information',
      other: 'Other documents'
    }
    const docList = docs.length > 0
      ? docs.map((d: string) => `• ${docLabels[d] || d}`).join('\n')
      : '• Any documents you have'
    const inAppMsg = `${attorneyName} has requested the following documents:\n\n${docList}${customMessage ? `\n\nMessage from your attorney: ${customMessage}` : ''}\n\nUpload here: ${uploadLink}`

    // In-app ChatRoom message
    if (assessment?.userId) {
      try {
        let chatRoom = await prisma.chatRoom.findUnique({
          where: {
            userId_attorneyId: { userId: assessment.userId, attorneyId: attorney.id }
          },
          select: { id: true },
        })
        if (!chatRoom) {
          chatRoom = await prisma.chatRoom.create({
            data: {
              userId: assessment.userId,
              attorneyId: attorney.id,
              assessmentId: lead.assessmentId
            }
          })
        }
        await prisma.message.create({
          data: {
            chatRoomId: chatRoom.id,
            senderId: attorney.id,
            senderType: 'attorney',
            content: inAppMsg,
            messageType: 'text'
          }
        })
        await prisma.chatRoom.update({
          where: { id: chatRoom.id },
          data: { lastMessageAt: new Date() }
        })
      } catch (chatErr: any) {
        logger.error('Failed to create in-app document request message', { error: (chatErr as Error).message })
      }
    }
    if (plaintiffEmail) {
      const subject = 'Your attorney requested additional documents'
      const message = `Hi ${plaintiffName},\n\n${attorneyName} has requested the following documents to strengthen your case:\n\n${docList}\n\n${customMessage ? `Message from your attorney: ${customMessage}\n\n` : ''}Upload here: ${uploadLink}\n\nBest regards,\nClearCaseIQ`
      await deliverDirectNotification({
        type: 'email',
        recipient: plaintiffEmail,
        subject,
        message,
        userId: assessment?.userId || null,
        assessmentId: lead.assessmentId,
        role: 'plaintiff',
        replyTo: attorney.email || null,
        fromName: attorney.name || null,
        metadata: {
          eventType: 'document_request',
          leadId,
          assessmentId: lead.assessmentId,
          documentRequestId: docRequest.id,
          uploadLink,
        },
      })
    }

    res.json(docRequest)
  } catch (error: any) {
    logger.error('Failed to create document request', { error: error.message })
    res.status(500).json({ error: 'Failed to create document request' })
  }
})

// Labels for documents an attorney can request from the opposing party / defendant / insurer.
const OPPOSING_DOC_LABELS: Record<string, string> = {
  dec_page: 'Declarations (Dec) page confirming coverage limits',
  insurance_policy: 'Insurance policy / declarations page',
  incident_report: 'Incident / accident report',
  surveillance: 'Surveillance or camera footage',
  maintenance_records: 'Maintenance / inspection records',
  vehicle_records: 'Vehicle / black-box (EDR) data',
  employment_records: 'Employment / training records',
  correspondence: 'Relevant correspondence',
  photos: 'Photographs of the scene/vehicle',
  other: 'Other documents',
}

const opposingDocRequestSchema = z.object({
  requestedDocs: z.array(z.string()).optional(),
  customMessage: z.string().max(4000).optional(),
  recipientName: z.string().min(1).max(200),
  recipientEmail: z.string().email().optional().or(z.literal('')),
  recipientRole: z.enum(['defendant', 'opposing_counsel', 'insurer']).optional(),
  caseContactId: z.string().optional(),
  suggestionId: z.string().optional(),
})

// Create a document request directed at the DEFENDANT / opposing party / insurer.
// Unlike the plaintiff flow, the recipient has no platform account, so they receive a
// tokenized external upload portal link instead of an in-app message.
router.post('/leads/:leadId/opposing-document-request', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const parsed = opposingDocRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    }
    const {
      requestedDocs = [],
      customMessage,
      recipientName,
      recipientEmail,
      recipientRole,
      caseContactId,
      suggestionId,
    } = parsed.data

    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const { lead, attorney } = auth

    const docs = Array.isArray(requestedDocs) ? requestedDocs : []
    const secureToken = crypto.randomUUID()
    const baseUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000'
    const uploadLink = `${baseUrl}/respond/documents/${secureToken}`

    const docRequest = await prisma.documentRequest.create({
      data: {
        leadId,
        attorneyId: attorney.id,
        requestedDocs: JSON.stringify(docs),
        customMessage: customMessage || null,
        secureToken,
        uploadLink,
        status: 'pending',
        targetType: 'opposing_party',
        recipientName,
        recipientEmail: recipientEmail || null,
        recipientRole: recipientRole || null,
        caseContactId: caseContactId || null,
        origin: suggestionId ? 'plaintiff_suggested' : 'attorney',
      },
    })

    await prisma.leadSubmission.update({
      where: { id: leadId },
      data: { lastContactAt: new Date() },
    })

    // If this fulfills a plaintiff suggestion, mark it sent and link the request.
    if (suggestionId) {
      await prisma.opposingDocRequestSuggestion.updateMany({
        where: { id: suggestionId, assessmentId: lead.assessmentId },
        data: { status: 'sent', documentRequestId: docRequest.id },
      })
    }

    const attorneyName = attorney.name || 'the attorney'
    const docList = docs.length > 0
      ? docs.map((d: string) => `• ${OPPOSING_DOC_LABELS[d] || d}`).join('\n')
      : '• See message below'
    const roleLabel = recipientRole === 'opposing_counsel'
      ? 'opposing counsel'
      : recipientRole === 'insurer'
        ? 'the insurer'
        : recipientRole === 'defendant'
          ? 'the defendant'
          : 'the requested party'

    // Email the external recipient a secure upload link (they have no account).
    if (recipientEmail) {
      const subject = `Document request regarding a claim — ${attorneyName}`
      const message = `Hello ${recipientName},\n\n${attorneyName} has requested the following documents in connection with a personal injury claim:\n\n${docList}\n\n${customMessage ? `${customMessage}\n\n` : ''}Please upload the documents securely here:\n${uploadLink}\n\nThis is a secure, single-purpose link. If you believe you received this in error, please disregard it.\n\nRegards,\nClearCaseIQ on behalf of ${attorneyName}`
      await deliverDirectNotification({
        type: 'email',
        recipient: recipientEmail,
        subject,
        message,
        assessmentId: lead.assessmentId,
        replyTo: attorney.email || null,
        fromName: attorney.name || null,
        metadata: {
          eventType: 'opposing_document_request',
          leadId,
          assessmentId: lead.assessmentId,
          documentRequestId: docRequest.id,
          targetType: 'opposing_party',
          uploadLink,
        },
      })
    }

    // Keep the plaintiff in the loop: CC them (email + in-app notification) so
    // they know a document request went out to the opposing party.
    const oppAssessment = await prisma.assessment.findUnique({
      where: { id: lead.assessmentId },
      select: {
        userId: true,
        facts: true,
        user: { select: { email: true, firstName: true } },
      },
    })
    let ccPlaintiffEmail = oppAssessment?.user?.email
    if (!ccPlaintiffEmail && oppAssessment?.facts) {
      try {
        const facts = typeof oppAssessment.facts === 'string' ? JSON.parse(oppAssessment.facts) : oppAssessment.facts
        ccPlaintiffEmail = (facts.plaintiffContext as any)?.email
      } catch {}
    }
    if (ccPlaintiffEmail) {
      const ccName = oppAssessment?.user?.firstName || 'there'
      const ccSubject = 'Your attorney sent a document request on your case'
      const ccMessage = `Hi ${ccName},\n\n${attorneyName} sent a request for the following documents to ${recipientName} (${roleLabel}) as part of building your case:\n\n${docList}\n\n${customMessage ? `Note included: ${customMessage}\n\n` : ''}No action is needed from you — this is just to keep you informed.\n\nBest regards,\nClearCaseIQ`
      await deliverDirectNotification({
        type: 'email',
        recipient: ccPlaintiffEmail,
        subject: ccSubject,
        message: ccMessage,
        userId: oppAssessment?.userId || null,
        assessmentId: lead.assessmentId,
        role: 'plaintiff',
        replyTo: attorney.email || null,
        fromName: attorney.name || null,
        metadata: {
          eventType: 'opposing_document_request_cc',
          leadId,
          assessmentId: lead.assessmentId,
          documentRequestId: docRequest.id,
          targetType: 'opposing_party',
        },
      })
    }

    // Surface the CC as an in-app message so it shows in the plaintiff's inbox/bell.
    if (oppAssessment?.userId) {
      try {
        let ccRoom = await prisma.chatRoom.findUnique({
          where: { userId_attorneyId: { userId: oppAssessment.userId, attorneyId: attorney.id } },
          select: { id: true },
        })
        if (!ccRoom) {
          ccRoom = await prisma.chatRoom.create({
            data: { userId: oppAssessment.userId, attorneyId: attorney.id, assessmentId: lead.assessmentId },
          })
        }
        await prisma.message.create({
          data: {
            chatRoomId: ccRoom.id,
            senderId: attorney.id,
            senderType: 'attorney',
            content: `FYI — I've requested the following documents from ${recipientName} (${roleLabel}) to support your case:\n\n${docList}\n\nNo action is needed from you.`,
            messageType: 'text',
          },
        })
        await prisma.chatRoom.update({
          where: { id: ccRoom.id },
          data: { lastMessageAt: new Date() },
        })
      } catch (ccChatErr: any) {
        logger.error('Failed to create opposing-request CC message', { error: (ccChatErr as Error).message })
      }
    }

    res.json({ ...docRequest, requestedDocs: docs })
  } catch (error: any) {
    logger.error('Failed to create opposing-party document request', { error: error.message })
    res.status(500).json({ error: 'Failed to create document request' })
  }
})

// List documents an opposing party has uploaded against a request (attorney view).
router.get('/document-requests/:requestId/uploads', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAttorneyFromReq(req)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const { requestId } = req.params

    const docRequest = await prisma.documentRequest.findFirst({
      where: { id: requestId, attorneyId: auth.attorney.id },
      include: {
        externalUploads: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!docRequest) return res.status(404).json({ error: 'Document request not found' })

    res.json(
      docRequest.externalUploads.map((u) => ({
        id: u.id,
        originalName: u.originalName,
        docType: u.docType,
        mimeType: u.mimeType,
        sizeBytes: u.sizeBytes,
        uploadedByName: u.uploadedByName,
        note: u.note,
        createdAt: u.createdAt,
      }))
    )
  } catch (error: any) {
    logger.error('Failed to list opposing-party uploads', { error: error.message })
    res.status(500).json({ error: 'Failed to load uploads' })
  }
})

// Download a single opposing-party uploaded file (attorney only).
router.get('/document-requests/:requestId/uploads/:uploadId/download', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAttorneyFromReq(req)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const { requestId, uploadId } = req.params

    const docRequest = await prisma.documentRequest.findFirst({
      where: { id: requestId, attorneyId: auth.attorney.id },
      select: { id: true },
    })
    if (!docRequest) return res.status(404).json({ error: 'Document request not found' })

    const upload = await prisma.externalDocumentUpload.findFirst({
      where: { id: uploadId, documentRequestId: requestId },
    })
    if (!upload || !fs.existsSync(upload.filePath)) {
      return res.status(404).json({ error: 'File not found' })
    }
    res.download(upload.filePath, upload.originalName)
  } catch (error: any) {
    logger.error('Failed to download opposing-party upload', { error: error.message })
    res.status(500).json({ error: 'Failed to download file' })
  }
})

// Plaintiff-suggested opposing-party document requests awaiting attorney review.
router.get('/leads/:leadId/opposing-document-suggestions', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const { lead } = auth

    const suggestions = await prisma.opposingDocRequestSuggestion.findMany({
      where: { OR: [{ leadId }, { assessmentId: lead.assessmentId }] },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    res.json(
      suggestions.map((s) => {
        let requested: string[] = []
        try {
          requested = JSON.parse(s.requestedDocs || '[]')
        } catch {
          requested = []
        }
        return {
          id: s.id,
          requestedDocs: requested,
          recipientName: s.recipientName,
          recipientRole: s.recipientRole,
          note: s.note,
          status: s.status,
          documentRequestId: s.documentRequestId,
          createdAt: s.createdAt,
        }
      })
    )
  } catch (error: any) {
    logger.error('Failed to list opposing-party suggestions', { error: error.message })
    res.status(500).json({ error: 'Failed to load suggestions' })
  }
})

// Schedule consultation (structured workflow)
router.post('/leads/:leadId/schedule-consult', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const { date, time, meetingType, notes } = req.body

    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const { lead, attorney } = auth

    const assessment = await prisma.assessment.findUnique({
      where: { id: lead.assessmentId },
      select: {
        userId: true,
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    })
    const userId = assessment?.userId
    if (!userId) {
      return res.status(400).json({ error: 'Plaintiff user not found for this case' })
    }

    const dateStr = date || new Date().toISOString().slice(0, 10)
    const timeStr = (time || '2:00 PM').trim()
    const isPm = /pm/i.test(timeStr)
    const numPart = timeStr.replace(/\s*[AP]M/i, '').trim()
    const [h, m] = numPart.split(':').map((x: string) => parseInt(x || '0', 10))
    let hour = isPm && h < 12 ? h + 12 : !isPm && h === 12 ? 0 : h
    const [y, mo, d] = dateStr.split('-').map(Number)
    const scheduledAt = new Date(y, mo - 1, d, hour, m || 0, 0)

    // Reuse an existing upcoming consult for this case instead of stacking a new
    // one on every click. Without this, repeated "Schedule Consultation" presses
    // created multiple SCHEDULED appointments, so the case's appointment card
    // rendered many times across the dashboard/calendar/events views.
    const existingUpcoming = await prisma.appointment.findFirst({
      where: {
        userId,
        attorneyId: attorney.id,
        assessmentId: lead.assessmentId,
        status: 'SCHEDULED',
      },
      orderBy: { scheduledAt: 'desc' },
    })

    const appointment = existingUpcoming
      ? await prisma.appointment.update({
          where: { id: existingUpcoming.id },
          data: {
            type: meetingType || 'phone',
            status: 'SCHEDULED',
            scheduledAt,
            duration: 30,
            notes: notes || null,
          },
        })
      : await prisma.appointment.create({
          data: {
            userId,
            attorneyId: attorney.id,
            assessmentId: lead.assessmentId,
            type: meetingType || 'phone',
            status: 'SCHEDULED',
            scheduledAt,
            duration: 30,
            notes: notes || null
          }
        })

    await prisma.leadSubmission.update({
      where: { id: leadId },
      data: {
        status: 'consulted',
        lastContactAt: new Date(),
        lifecycleState: 'consultation_scheduled'
      }
    })

    await prisma.leadContact.create({
      data: {
        leadId,
        attorneyId: attorney.id,
        contactType: 'consult',
        contactMethod: 'scheduled',
        scheduledAt,
        notes: notes || `Consultation scheduled for ${date} at ${time} (${meetingType})`,
        status: 'sent'
      }
    })

    // For video consults, mint a join link (Google Meet / Teams) via the
    // attorney's connected calendar and persist it so it shows up on the
    // dashboard, calendar, and confirmation email. Skip if one already exists
    // to avoid creating a fresh room on repeated "Schedule Consultation" clicks.
    let meetingUrl = appointment.meetingUrl
    if (meetingType === 'video' && !meetingUrl) {
      try {
        const externalEvent = await createExternalCalendarEvent({
          attorneyId: attorney.id,
          title: `ClearCaseIQ Consultation (video)`,
          start: scheduledAt,
          end: new Date(scheduledAt.getTime() + appointment.duration * 60000),
          description: `Video consultation booked in ClearCaseIQ for assessment ${lead.assessmentId}.`,
          createVideoLink: true,
        })

        if (externalEvent) {
          meetingUrl = externalEvent.meetingUrl
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: {
              externalCalendarProvider: externalEvent.provider,
              externalCalendarEventId: externalEvent.externalEventId,
              externalCalendarSyncedAt: new Date(),
              ...(externalEvent.meetingUrl ? { meetingUrl: externalEvent.meetingUrl } : {}),
            },
          })
        }
      } catch (calendarError: any) {
        logger.warn('Video link creation for consult failed', {
          calendarError: calendarError?.message,
          appointmentId: appointment.id,
          attorneyId: attorney.id,
        })
      }
    }

    const user = assessment.user
    const plaintiffEmail = user?.email
    if (plaintiffEmail) {
      const attorneyName = attorney.name || 'Smith Injury Law'
      const dateStr = scheduledAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      const timeStr = scheduledAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      const typeLabel = meetingType === 'phone' ? 'Phone consultation' : meetingType === 'video' ? 'Video call' : 'In person'
      const subject = 'Your consultation has been scheduled'
      const joinLine = meetingType === 'video' && meetingUrl ? `Join link: ${meetingUrl}\n` : ''
      const message = `Hi${user?.firstName ? ` ${user.firstName}` : ''},\n\nYour consultation has been scheduled.\n\nAttorney: ${attorneyName}\nDate: ${dateStr}\nTime: ${timeStr}\nType: ${typeLabel}\n${joinLine}\n${notes ? `Notes: ${notes}\n\n` : ''}Best regards,\nClearCaseIQ`
      await createNotification(plaintiffEmail, subject, message, {
        leadId,
        assessmentId: lead.assessmentId,
        appointmentId: appointment.id,
        scheduledAt: scheduledAt.toISOString()
      }, {
        replyTo: attorney.email || null,
        fromName: attorney.name || null,
        userId: userId || null,
        assessmentId: lead.assessmentId,
        role: 'plaintiff',
      })
    }

    res.json({ ...appointment, meetingUrl })
  } catch (error: any) {
    logger.error('Failed to schedule consultation', { error: error.message })
    res.status(500).json({ error: 'Failed to schedule consultation' })
  }
})

// Get lead contact history
router.get('/leads/:leadId/contacts', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const attorney = await prisma.attorney.findFirst({
      where: { email: req.user.email },
      select: { id: true },
    })

    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }

    const attorneyId = attorney.id

    const contacts = await prisma.leadContact.findMany({
      where: {
        leadId,
        attorneyId
      },
      select: {
        id: true,
        leadId: true,
        attorneyId: true,
        contactType: true,
        contactMethod: true,
        status: true,
        scheduledAt: true,
        completedAt: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json(contacts)
  } catch (error: any) {
    logger.error('Failed to get contact history', { error: error.message })
    res.status(500).json({ error: 'Failed to get contact history' })
  }
})

// List all case contacts for the attorney (across all leads)
router.get('/case-contacts', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAttorneyFromReq(req)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { attorney } = auth

    const contacts = await prisma.caseContact.findMany({
      where: { attorneyId: attorney.id },
      select: {
        id: true,
        leadId: true,
        attorneyId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        companyName: true,
        companyUrl: true,
        title: true,
        contactType: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        lead: {
          select: {
            id: true,
            assessment: {
              select: { claimType: true, venueCounty: true, venueState: true }
            }
          },
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(contacts)
  } catch (error: any) {
    logger.error('Failed to get case contacts', { error: error.message })
    res.status(500).json({ error: 'Failed to get case contacts' })
  }
})

// List case contacts for a lead
router.get('/leads/:leadId/case-contacts', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { attorney } = auth

    const contacts = await prisma.caseContact.findMany({
      where: { leadId, attorneyId: attorney.id },
      select: {
        id: true,
        leadId: true,
        attorneyId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        companyName: true,
        companyUrl: true,
        title: true,
        contactType: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(contacts)
  } catch (error: any) {
    logger.error('Failed to get case contacts', { error: error.message })
    res.status(500).json({ error: 'Failed to get case contacts' })
  }
})

// Create case contact
router.post('/leads/:leadId/case-contacts', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { attorney } = auth

    const body = req.body
    const firstName = (body.firstName ?? '').trim()
    const lastName = (body.lastName ?? '').trim()
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' })
    }

    const rawPhone = body.phone?.trim() || ''
    if (rawPhone && !isValidPhone(rawPhone)) {
      return res.status(400).json({ error: PHONE_ERROR_MESSAGE })
    }
    const normalizedPhone = rawPhone ? normalizePhone(rawPhone) : null

    const contact = await prisma.caseContact.create({
      data: {
        leadId,
        attorneyId: attorney.id,
        firstName,
        lastName: lastName,
        email: body.email?.trim() || null,
        phone: normalizedPhone,
        companyName: body.companyName?.trim() || null,
        companyUrl: body.companyUrl?.trim() || null,
        title: body.title?.trim() || null,
        contactType: body.contactType?.trim() || null,
        notes: body.notes?.trim() || null
      },
      select: {
        id: true,
        leadId: true,
        attorneyId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        companyName: true,
        companyUrl: true,
        title: true,
        contactType: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    res.status(201).json(contact)
  } catch (error: any) {
    logger.error('Failed to create case contact', { error: error.message, stack: error.stack })
    res.status(500).json({
      error: 'Failed to create case contact',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Update case contact
router.patch('/leads/:leadId/case-contacts/:contactId', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, contactId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { attorney } = auth

    const body = req.body
    const update: Record<string, any> = {}
    if (body.firstName != null) update.firstName = String(body.firstName).trim()
    if (body.lastName != null) update.lastName = String(body.lastName).trim()
    if (body.email != null) update.email = body.email ? String(body.email).trim() : null
    if (body.phone != null) {
      const trimmedPhone = String(body.phone).trim()
      if (trimmedPhone && !isValidPhone(trimmedPhone)) {
        return res.status(400).json({ error: PHONE_ERROR_MESSAGE })
      }
      update.phone = trimmedPhone ? normalizePhone(trimmedPhone) : null
    }
    if (body.companyName != null) update.companyName = body.companyName ? String(body.companyName).trim() : null
    if (body.companyUrl != null) update.companyUrl = body.companyUrl ? String(body.companyUrl).trim() : null
    if (body.title != null) update.title = body.title ? String(body.title).trim() : null
    if (body.contactType != null) update.contactType = body.contactType ? String(body.contactType).trim() : null
    if (body.notes != null) update.notes = body.notes ? String(body.notes).trim() : null

    const contact = await prisma.caseContact.updateMany({
      where: { id: contactId, leadId, attorneyId: attorney.id },
      data: update
    })
    if (contact.count === 0) {
      return res.status(404).json({ error: 'Case contact not found' })
    }
    const updated = await prisma.caseContact.findFirst({
      where: { id: contactId, leadId, attorneyId: attorney.id },
      select: {
        id: true,
        leadId: true,
        attorneyId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        companyName: true,
        companyUrl: true,
        title: true,
        contactType: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    res.json(updated)
  } catch (error: any) {
    logger.error('Failed to update case contact', { error: error.message })
    res.status(500).json({ error: 'Failed to update case contact' })
  }
})

// Delete case contact
router.delete('/leads/:leadId/case-contacts/:contactId', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, contactId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { attorney } = auth

    const result = await prisma.caseContact.deleteMany({
      where: { id: contactId, leadId, attorneyId: attorney.id }
    })
    if (result.count === 0) {
      return res.status(404).json({ error: 'Case contact not found' })
    }
    res.status(204).send()
  } catch (error: any) {
    logger.error('Failed to delete case contact', { error: error.message })
    res.status(500).json({ error: 'Failed to delete case contact' })
  }
})

// Get evidence files for a lead
router.get('/leads/:leadId/evidence', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params

    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead, attorney } = auth

    const assessment = await prisma.assessment.findUnique({
      where: { id: lead.assessmentId },
      select: { userId: true, createdAt: true, facts: true }
    })

    // Backfill: link unassigned plaintiff uploads to this assessment (recent window)
    if (assessment?.userId) {
      const existingCount = await prisma.evidenceFile.count({
        where: { assessmentId: lead.assessmentId }
      })

      if (existingCount === 0) {
        const createdAt = assessment.createdAt
        const windowStart = new Date(createdAt)
        windowStart.setDate(windowStart.getDate() - 7)

        await prisma.evidenceFile.updateMany({
          where: {
            assessmentId: null,
            userId: assessment.userId,
            createdAt: { gte: windowStart }
          },
          data: { assessmentId: lead.assessmentId }
        })
      }
    }

    const evidenceFiles = await prisma.evidenceFile.findMany({
      where: {
        OR: [
          { assessmentId: lead.assessmentId },
          ...(assessment?.userId ? [{ userId: assessment.userId }] : [])
        ]
      },
      select: {
        id: true,
        userId: true,
        assessmentId: true,
        originalName: true,
        filename: true,
        mimetype: true,
        size: true,
        fileUrl: true,
        category: true,
        subcategory: true,
        description: true,
        dataType: true,
        processingStatus: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    const medicalSharing = buildMedicalSharingStatus({
      ...assessment,
      evidenceFiles,
    })
    res.json(
      medicalSharing.canShareMedicalData
        ? evidenceFiles
        : evidenceFiles.filter((file) => !isMedicalEvidenceFile(file))
    )
  } catch (error: any) {
    logger.error('Failed to load lead evidence files', { error: error.message })
    res.status(500).json({ error: 'Failed to load evidence files' })
  }
})

router.post('/leads/:leadId/evidence/:fileId/review', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, fileId } = req.params
    const { content, status } = req.body || {}
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead, attorney } = auth

    const file = await prisma.evidenceFile.findFirst({
      where: { id: fileId, assessmentId: lead.assessmentId },
      select: { id: true }
    })
    if (!file) {
      return res.status(404).json({ error: 'Evidence file not found' })
    }

    const reviewed = status !== 'needs_follow_up'
    const updated = await prisma.evidenceFile.update({
      where: { id: fileId },
      data: {
        isVerified: reviewed,
        verifiedBy: reviewed ? attorney.id : null,
        verifiedAt: reviewed ? new Date() : null,
        description: content || undefined
      },
      select: {
        id: true,
        originalName: true,
        filename: true,
        mimetype: true,
        size: true,
        fileUrl: true,
        category: true,
        isVerified: true,
        verifiedAt: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (content && req.user?.id) {
      await prisma.evidenceAnnotation.create({
        data: {
          evidenceFileId: fileId,
          authorId: req.user.id,
          content,
          anchor: status || 'reviewed'
        }
      }).catch((error: any) => logger.warn('Failed to create evidence review annotation', { error: error?.message, fileId }))
    }

    res.json(updated)
  } catch (error: any) {
    logger.error('Failed to review evidence file', { error: error.message, leadId: req.params.leadId, fileId: req.params.fileId })
    res.status(500).json({ error: 'Failed to review evidence file' })
  }
})

// Upload a document to an accepted / assigned case (attorney adds to plaintiff file set)
router.post(
  '/leads/:leadId/evidence',
  authMiddleware,
  leadAttorneyEvidenceMulter.single('file'),
  async (req: any, res) => {
    try {
      const { leadId } = req.params
      const auth = await getAuthorizedLead(req, leadId)
      if (auth.error) {
        return res.status(auth.error.status).json({ error: auth.error.message })
      }
      const { lead, attorney } = auth

      if (lead.assignedAttorneyId !== attorney.id) {
        return res.status(403).json({
          error: 'Only the assigned attorney can upload documents for this case.',
        })
      }
      if (lead.status === 'submitted' || lead.status === 'rejected') {
        return res.status(400).json({
          error: 'Upload is available after you accept this lead.',
        })
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }

      const assessment = await prisma.assessment.findUnique({
        where: { id: lead.assessmentId },
        select: { userId: true },
      })
      if (!assessment?.userId) {
        return res.status(400).json({ error: 'Case has no plaintiff user linked; cannot attach documents.' })
      }

      const plaintiffUserId = assessment.userId
      const category = (req.body?.category as string) || 'other'
      const description = (req.body?.description as string) || null
      const dataType =
        ['medical_records', 'police_report', 'bills'].includes(category) ? 'structured' : 'unstructured'

      const provenanceNotes = JSON.stringify({
        source: 'attorney_mobile_or_dashboard',
        attorneyId: attorney.id,
        attorneyEmail: attorney.email,
        uploadedAt: new Date().toISOString(),
      })

      const evidenceFile = await prisma.evidenceFile.create({
        data: {
          userId: plaintiffUserId,
          assessmentId: lead.assessmentId,
          originalName: req.file.originalname,
          filename: req.file.filename,
          mimetype: req.file.mimetype,
          size: req.file.size,
          filePath: req.file.path,
          fileUrl: `/uploads/evidence/${req.file.filename}`,
          category,
          subcategory: null,
          description,
          dataType,
          tags: JSON.stringify(['attorney_upload']),
          relevanceScore: 0,
          uploadMethod: 'file_picker',
          processingStatus: 'pending',
          isHIPAA: category === 'medical_records',
          accessLevel: 'private',
          provenanceSource: 'attorney',
          provenanceNotes,
          provenanceActor: req.user?.email || attorney.email || null,
          provenanceDate: new Date(),
        },
        select: {
          id: true,
          userId: true,
          assessmentId: true,
          originalName: true,
          filename: true,
          mimetype: true,
          size: true,
          fileUrl: true,
          category: true,
          subcategory: true,
          description: true,
          dataType: true,
          processingStatus: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      await prisma.evidenceProcessingJob.create({
        data: {
          evidenceFileId: evidenceFile.id,
          jobType: 'full_processing',
          status: 'queued',
          priority: 5,
        },
      })

      await prisma.evidenceAccessLog.create({
        data: {
          evidenceFileId: evidenceFile.id,
          accessedBy: req.user!.id,
          accessType: 'upload',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          purpose: 'Attorney upload to case',
        },
      })

      void runAnalysisForAssessment(lead.assessmentId)
      // Re-run the valuation so an attorney-collected document updates the live
      // estimate the same way a client upload does.
      void runCaseRecalculation(lead.assessmentId, 'document_upload')
      logger.info('Attorney uploaded case document', {
        leadId,
        evidenceFileId: evidenceFile.id,
        attorneyId: attorney.id,
      })
      res.status(201).json(evidenceFile)
    } catch (error: any) {
      logger.error('Attorney lead evidence upload failed', { error: error.message })
      res.status(500).json({ error: 'Failed to upload document', details: error.message })
    }
  }
)

// Case Insights - Medical Chronology, Case Preparation, Settlement Benchmarks (for accepted leads)
router.get('/leads/:leadId/medical-chronology', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const assessment = await prisma.assessment.findUnique({
      where: { id: auth.lead.assessmentId },
      include: { evidenceFiles: true, user: { select: { id: true } } }
    })
    const medicalSharing = buildMedicalSharingStatus(assessment)
    if (!medicalSharing.canShareMedicalData) {
      return res.json({ chronology: [], summary: null, medicalSharing })
    }
    const [chronology, summary] = await Promise.all([
      buildMedicalChronology(auth.lead.assessmentId),
      buildMedicalChronologySummary(auth.lead.assessmentId),
    ])
    res.json({ chronology, summary, medicalSharing })
  } catch (error: any) {
    logger.error('Failed to get medical chronology', { error: error.message, leadId: req.params.leadId })
    res.status(500).json({ error: 'Failed to get medical chronology' })
  }
})

router.get('/leads/:leadId/case-preparation', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const preparation = await computeCasePreparation(auth.lead.assessmentId)
    res.json(preparation)
  } catch (error: any) {
    logger.error('Failed to get case preparation', { error: error.message, leadId: req.params.leadId })
    res.status(500).json({ error: 'Failed to get case preparation' })
  }
})

router.get('/leads/:leadId/settlement-benchmarks', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const benchmarks = await getSettlementBenchmarks(auth.lead.assessmentId)
    res.json({ benchmarks })
  } catch (error: any) {
    logger.error('Failed to get settlement benchmarks', { error: error.message, leadId: req.params.leadId })
    res.status(500).json({ error: 'Failed to get settlement benchmarks' })
  }
})

// Case intake & import endpoints
router.post('/intake/manual', authMiddleware, async (req: any, res) => {
  try {
    const payload = intakeManualSchema.parse(req.body || {})
    const auth = await getAttorneyFromReq(req)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const claimType = payload.claimType || getTemplateClaimType(payload.template)
    const assessment = await createDraftAssessment({
      claimType,
      venueState: payload.venueState,
      plaintiffFirstName: payload.plaintiffFirstName,
      plaintiffLastName: payload.plaintiffLastName,
      plaintiffEmail: payload.plaintiffEmail,
      plaintiffPhone: payload.plaintiffPhone
    })
    const inviteLink = `${process.env.APP_URL || process.env.FRONTEND_URL || process.env.WEB_URL || 'http://localhost:3000'}/evidence-upload/${assessment.id}`
    const inviteRequested = Boolean(payload.sendInvite && payload.plaintiffEmail)
    if (inviteRequested) {
      const plaintiffName = [payload.plaintiffFirstName, payload.plaintiffLastName].filter(Boolean).join(' ') || 'there'
      await createNotification(
        payload.plaintiffEmail!,
        'Your attorney invited you to complete your case intake',
        `Hi ${plaintiffName},\n\n${auth.attorney.name || 'Your attorney'} created a draft case for you in ClearCaseIQ. Please use this secure link to upload documents and help complete your intake:\n\n${inviteLink}\n\nBest regards,\nClearCaseIQ`,
        {
          assessmentId: assessment.id,
          attorneyId: auth.attorney.id,
          kind: 'manual_case_invite'
        }
      )
    }
    await prisma.caseIntakeRequest.create({
      data: {
        attorneyId: auth.attorney.id,
        assessmentId: assessment.id,
        kind: 'manual',
        payload: JSON.stringify({
          template: payload.template || null,
          claimType: assessment.claimType,
          venueState: assessment.venueState,
          notes: payload.notes || null,
          plaintiffFirstName: payload.plaintiffFirstName || null,
          plaintiffLastName: payload.plaintiffLastName || null,
          plaintiffEmail: payload.plaintiffEmail || null,
          plaintiffPhone: payload.plaintiffPhone || null,
          inviteSent: inviteRequested,
          inviteLink
        })
      }
    })
    res.json({
      assessmentId: assessment.id,
      claimType: assessment.claimType,
      venueState: assessment.venueState,
      notes: payload.notes || null,
      plaintiffEmail: payload.plaintiffEmail || null,
      inviteSent: inviteRequested,
      inviteLink
    })
  } catch (error: any) {
    logger.error('Failed to create manual intake', { error: error.message })
    res.status(400).json({ error: 'Failed to create manual intake' })
  }
})

router.post('/intake/from-lead', authMiddleware, async (req: any, res) => {
  try {
    const payload = intakeFromLeadSchema.parse(req.body || {})
    const auth = await getAuthorizedLead(req, payload.leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    await prisma.caseIntakeRequest.create({
      data: {
        attorneyId: auth.attorney.id,
        assessmentId: auth.lead.assessmentId,
        leadId: auth.lead.id,
        kind: 'from_lead',
        payload: JSON.stringify({
          leadId: auth.lead.id,
          assessmentId: auth.lead.assessmentId
        })
      }
    })
    res.json({ assessmentId: auth.lead.assessmentId })
  } catch (error: any) {
    logger.error('Failed to convert lead to case', { error: error.message })
    res.status(400).json({ error: 'Failed to convert lead to case' })
  }
})

router.post('/intake/clone-template', authMiddleware, async (req: any, res) => {
  try {
    const payload = intakeManualSchema.parse(req.body || {})
    const auth = await getAttorneyFromReq(req)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const claimType = getTemplateClaimType(payload.template)
    const assessment = await createDraftAssessment({ claimType, venueState: payload.venueState })
    await prisma.caseIntakeRequest.create({
      data: {
        attorneyId: auth.attorney.id,
        assessmentId: assessment.id,
        kind: 'clone_template',
        payload: JSON.stringify({
          template: payload.template || null,
          claimType: assessment.claimType,
          venueState: assessment.venueState
        })
      }
    })
    res.json({
      assessmentId: assessment.id,
      template: payload.template || null
    })
  } catch (error: any) {
    logger.error('Failed to clone intake template', { error: error.message })
    res.status(400).json({ error: 'Failed to clone intake template' })
  }
})

router.post('/intake/import', authMiddleware, intakeImportUpload.array('files', 10), async (req: any, res) => {
  try {
    const uploadedFiles = (req.files || []) as Express.Multer.File[]
    const bodyFiles = Array.isArray(req.body?.files) ? req.body.files : undefined
    const payload = intakeImportSchema.parse({
      ...(req.body || {}),
      includeDocuments: parseBoolean(req.body?.includeDocuments, true),
      includeHistory: parseBoolean(req.body?.includeHistory, true),
      includeTasks: parseBoolean(req.body?.includeTasks, true),
      includeMedical: parseBoolean(req.body?.includeMedical, true),
      files: bodyFiles,
    })
    const auth = await getAttorneyFromReq(req)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const importId = crypto.randomUUID()
    const parsedFiles = uploadedFiles.map((file) => parseImportFile(file))
    const fileRows = parsedFiles.flatMap((file) => file.rows.map((row) => ({ fileName: file.fileName, row })))
    const uploadedFileSummaries = uploadedFiles.map((file) => ({
      name: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    }))
    const metadataFiles = payload.files || []
    const fileSummaries = uploadedFileSummaries.length > 0 ? uploadedFileSummaries : metadataFiles
    const unsupportedFiles = parsedFiles
      .filter((file) => file.unsupportedReason)
      .map((file) => ({ name: file.fileName, reason: file.unsupportedReason }))
    const createdAssessments: Array<{ id: string; fileName?: string; externalId: string | null }> = []

    if (fileRows.length > 0) {
      for (const item of fileRows) {
        const importedCase = normalizeImportedCase(payload.source, item.row)
        const assessment = await createDraftAssessment({
          claimType: importedCase.claimType,
          venueState: importedCase.venueState,
          venueCounty: importedCase.venueCounty,
          plaintiffFirstName: importedCase.plaintiffFirstName,
          plaintiffLastName: importedCase.plaintiffLastName,
          plaintiffEmail: importedCase.plaintiffEmail,
          plaintiffPhone: importedCase.plaintiffPhone,
          incidentDate: importedCase.incidentDate,
          narrative: importedCase.narrative,
          source: payload.source,
          externalId: importedCase.externalId,
          rawImport: importedCase.raw,
        })
        await prisma.caseIntakeRequest.create({
          data: {
            attorneyId: auth.attorney.id,
            assessmentId: assessment.id,
            kind: 'import',
            source: payload.source,
            status: 'imported',
            payload: JSON.stringify({
              importId,
              source: payload.source,
              externalId: importedCase.externalId,
              fileName: item.fileName,
              includeDocuments: payload.includeDocuments ?? true,
              includeHistory: payload.includeHistory ?? true,
              includeTasks: payload.includeTasks ?? true,
              includeMedical: payload.includeMedical ?? true,
              notes: payload.notes || null,
              importedCase,
              files: fileSummaries,
            })
          }
        })
        if (payload.includeTasks && importedCase.taskTitle) {
          await prisma.caseTask.create({
            data: {
              assessmentId: assessment.id,
              title: importedCase.taskTitle,
              dueDate: importedCase.taskDueDate || null,
              priority: 'medium',
              status: 'open',
            }
          })
        }
        await prisma.caseNote.create({
          data: {
            assessmentId: assessment.id,
            authorName: auth.attorney.name || null,
            authorEmail: auth.attorney.email || null,
            noteType: 'update',
            message: [
              `${payload.source} import`,
              importedCase.narrative,
              payload.notes ? `Import notes: ${payload.notes}` : '',
              importedCase.externalId ? `External ID: ${importedCase.externalId}` : '',
            ].filter(Boolean).join('\n\n') || `Imported from ${payload.source}.`,
          }
        })
        createdAssessments.push({ id: assessment.id, fileName: item.fileName, externalId: importedCase.externalId })
      }
    } else {
      const assessment = await createDraftAssessment({ claimType: 'auto', venueState: 'CA', source: payload.source })
      await prisma.caseIntakeRequest.create({
        data: {
          attorneyId: auth.attorney.id,
          assessmentId: assessment.id,
          kind: 'import',
          source: payload.source,
          payload: JSON.stringify({
            importId,
            source: payload.source,
            includeDocuments: payload.includeDocuments ?? true,
            includeHistory: payload.includeHistory ?? true,
            includeTasks: payload.includeTasks ?? true,
            includeMedical: payload.includeMedical ?? true,
            notes: payload.notes || null,
            files: fileSummaries,
            unsupportedFiles,
          })
        }
      })
      createdAssessments.push({ id: assessment.id, externalId: null })
    }

    res.json({
      importId,
      assessmentId: createdAssessments[0]?.id,
      assessmentIds: createdAssessments.map((assessment) => assessment.id),
      createdCount: createdAssessments.length,
      source: payload.source,
      includeDocuments: payload.includeDocuments ?? true,
      includeHistory: payload.includeHistory ?? true,
      includeTasks: payload.includeTasks ?? true,
      includeMedical: payload.includeMedical ?? true,
      files: fileSummaries,
      unsupportedFiles,
    })
  } catch (error: any) {
    logger.error('Failed to import case', { error: error.message })
    res.status(400).json({ error: error.message || 'Failed to import case' })
  }
})

router.post('/intake/smart-config', authMiddleware, async (req: any, res) => {
  try {
    const payload = smartIntakeSchema.parse(req.body || {})
    const auth = await getAttorneyFromReq(req)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const record = await prisma.attorneyIntakeConfig.upsert({
      where: { attorneyId: auth.attorney.id },
      update: { config: JSON.stringify(payload) },
      create: { attorneyId: auth.attorney.id, config: JSON.stringify(payload) }
    })
    res.json({ ok: true, config: payload, updatedAt: record.updatedAt })
  } catch (error: any) {
    logger.error('Failed to save smart intake config', { error: error.message })
    res.status(400).json({ error: 'Failed to save smart intake config' })
  }
})

// Download full case file (assessment + evidence)
router.get('/leads/:leadId/case-file', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth

    const assessment = await prisma.assessment.findUnique({
      where: { id: lead.assessmentId },
      include: { files: true, evidenceFiles: true, user: { select: { id: true } } }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename=case-file-${leadId}.zip`)

    const archive = archiver('zip', { zlib: { level: 9 } })
    archive.on('error', (err: Error) => {
      logger.error('Failed to build case file zip', { error: err.message, leadId })
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to build case file' })
      }
    })
    archive.pipe(res)

    const included: Array<{ name: string; source: string }> = []
    const missing: Array<{ name: string; source: string }> = []

    const addFile = (filePath: string, archivePath: string, source: string) => {
      const resolved = resolveStoragePath(filePath)
      if (fs.existsSync(resolved)) {
        archive.file(resolved, { name: archivePath })
        included.push({ name: archivePath, source })
      } else {
        missing.push({ name: archivePath, source })
      }
    }

    for (const file of assessment.files || []) {
      const archivePath = path.posix.join('assessment-files', file.originalName || file.filename)
      addFile(file.path, archivePath, 'assessment')
    }

    const medicalSharing = buildMedicalSharingStatus(assessment)
    const evidenceFilesForDownload = medicalSharing.canShareMedicalData
      ? assessment.evidenceFiles || []
      : (assessment.evidenceFiles || []).filter((file: any) => !isMedicalEvidenceFile(file))

    for (const file of evidenceFilesForDownload) {
      const archivePath = path.posix.join('evidence-files', file.originalName || file.filename)
      addFile(file.filePath, archivePath, 'evidence')
    }

    const manifest = {
      leadId,
      assessmentId: assessment.id,
      includedCount: included.length,
      missingCount: missing.length,
      included,
      missing,
      medicalSharing
    }
    archive.append(Buffer.from(JSON.stringify(manifest, null, 2)), { name: 'manifest.json' })

    await archive.finalize()
  } catch (error: any) {
    logger.error('Failed to download case file', { error: error.message })
    res.status(500).json({ error: 'Failed to download case file' })
  }
})

// Litigation finance summary for a lead
router.get('/leads/:leadId/finance/summary', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth

    const assessment = await prisma.assessment.findUnique({
      where: { id: lead.assessmentId },
      include: {
        predictions: true,
        files: true,
        evidenceFiles: true,
        user: { select: { id: true } },
        demandLetters: true,
        insuranceDetails: true,
        lienHolders: true,
        caseTasks: true,
        negotiationEvents: true,
        caseNotes: true
      }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    const facts = safeJsonParse<any>(assessment.facts, {})
    const injuries = Array.isArray(facts.injuries) ? facts.injuries : []
    const treatment = Array.isArray(facts.treatment) ? facts.treatment : []
    const damages = facts.damages || {}
    const medicalDamages = Number(damages.medical || damages.medicalExpenses || 0)
    const wageDamages = Number(damages.lostWages || damages.wageLoss || 0)
    const otherDamages = Number(damages.other || 0)

    const prediction = pickLatestPrediction(assessment.predictions)
    const bands = safeJsonParse<any>(prediction?.bands, {})
    const viability = safeJsonParse<any>(prediction?.viability, {})
    const viabilityScore = typeof viability?.overall === 'number' ? viability.overall : null

    const evidenceCount = assessment.evidenceFiles?.length || 0
    const fileCount = assessment.files?.length || 0
    const demandLetters = assessment.demandLetters || []
    const insuranceLimits = (assessment.insuranceDetails || [])
      .map((detail: any) => detail.policyLimit)
      .filter((limit: any) => typeof limit === 'number')
    const insuranceLimit = insuranceLimits.length > 0
      ? insuranceLimits.reduce((sum: number, limit: number) => sum + limit, 0)
      : null

    const lienTotal = (assessment.lienHolders || [])
      .map((lien: any) => lien.amount)
      .filter((amount: any) => typeof amount === 'number')
      .reduce((sum: number, amount: number) => sum + amount, 0)
    const openTaskCount = (assessment.caseTasks || []).filter((task: any) => task.status !== 'completed').length
    const negotiationCount = assessment.negotiationEvents?.length || 0
    const noteCount = assessment.caseNotes?.length || 0
    const [billingInvoices, billingPayments] = await Promise.all([
      prisma.billingInvoice.findMany({
        where: { assessmentId: assessment.id },
        select: { amount: true },
      }).catch((error) => {
        logger.warn('Failed to load billing invoices for finance summary', { assessmentId: assessment.id, error: error?.message })
        return []
      }),
      prisma.billingPayment.findMany({
        where: { assessmentId: assessment.id },
        select: { amount: true },
      }).catch((error) => {
        logger.warn('Failed to load billing payments for finance summary', { assessmentId: assessment.id, error: error?.message })
        return []
      }),
    ])
    const invoiceTotal = billingInvoices
      .map((inv: any) => inv.amount)
      .filter((amount: any) => typeof amount === 'number')
      .reduce((sum: number, amount: number) => sum + amount, 0)
    const paymentTotal = billingPayments
      .map((p: any) => p.amount)
      .filter((amount: any) => typeof amount === 'number')
      .reduce((sum: number, amount: number) => sum + amount, 0)

    const { riskScore, riskLevel } = buildRiskProfile({
      evidenceCount,
      injuryCount: injuries.length,
      treatmentCount: treatment.length,
      insuranceLimit,
      viabilityScore
    })

    const expectedValue = typeof bands?.median === 'number' ? bands.median : 0
    const downside = typeof bands?.p25 === 'number' ? bands.p25 : 0
    const upside = typeof bands?.p75 === 'number' ? bands.p75 : 0

    res.json({
      casePackaging: {
        leadId: lead.id,
        assessmentId: assessment.id,
        claimType: assessment.claimType,
        venueState: assessment.venueState || facts?.venue?.state || null,
        status: lead.status,
        incidentDate: facts?.incident?.date || null,
        injuriesCount: injuries.length,
        treatmentCount: treatment.length,
        evidenceCount,
        fileCount,
        demandLettersCount: demandLetters.length,
        insuranceLimit,
        lienTotal,
        openTaskCount,
        negotiationCount,
        noteCount
      },
      riskReturnProfile: {
        riskScore,
        riskLevel,
        expectedValue,
        downside,
        upside,
        confidence: expectedValue ? 'medium' : 'low'
      },
      underwritingView: {
        claimType: assessment.claimType,
        venueState: assessment.venueState || facts?.venue?.state || null,
        incidentDate: facts?.incident?.date || null,
        injuriesSummary: injuries.length ? injuries.slice(0, 5) : [],
        treatmentSummary: treatment.length ? treatment.slice(0, 5) : [],
        damages: {
          medical: medicalDamages,
          lostWages: wageDamages,
          other: otherDamages
        },
        evidenceCount,
        demandTarget: demandLetters[0]?.targetAmount || null,
        insuranceLimit,
        lienTotal,
        invoiceTotal,
        paymentTotal,
        viabilityScore,
        openTaskCount,
        negotiationCount,
        noteCount
      }
    })
  } catch (error: any) {
    logger.error('Failed to build finance summary', { error: error.message })
    res.status(500).json({ error: 'Failed to build finance summary' })
  }
})

const caseShareSchema = z.object({
  sharedWithAttorneyId: z.string().optional(),
  sharedWithFirmName: z.string().optional(),
  sharedWithEmail: z.string().optional(),
  accessLevel: z.enum(['view', 'edit']).optional(),
  message: z.string().optional()
})

const referralSchema = z.object({
  receivingAttorneyId: z.string().optional(),
  receivingFirmName: z.string().optional(),
  receivingEmail: z.string().optional(),
  feeSplitPercent: z.number().optional(),
  projectedRecovery: z.number().optional(),
  status: z.string().optional(),
  notes: z.string().optional()
})

const coCounselSchema = z.object({
  coCounselAttorneyId: z.string().optional(),
  coCounselFirmName: z.string().optional(),
  coCounselEmail: z.string().optional(),
  feeSplitPercent: z.number().optional(),
  projectedRecovery: z.number().optional(),
  workflowStatus: z.string().optional(),
  nextStep: z.string().optional(),
  notes: z.string().optional()
})

// Case sharing
router.get('/leads/:leadId/case-shares', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth

    const shares = await prisma.caseShare.findMany({
      where: { assessmentId: lead.assessmentId },
      orderBy: { createdAt: 'desc' }
    })
    res.json(shares)
  } catch (error: any) {
    logger.error('Failed to load case shares', { error: error.message })
    res.status(500).json({ error: 'Failed to load case shares' })
  }
})

router.post('/leads/:leadId/case-shares', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const payload = caseShareSchema.parse(req.body || {})

    const share = await prisma.caseShare.create({
      data: {
        assessmentId: auth.lead.assessmentId,
        sharedByAttorneyId: auth.attorney.id,
        sharedWithAttorneyId: payload.sharedWithAttorneyId || null,
        sharedWithFirmName: payload.sharedWithFirmName || null,
        sharedWithEmail: payload.sharedWithEmail || null,
        accessLevel: payload.accessLevel || 'view',
        message: payload.message || null
      }
    })
    const recipientEmail =
      payload.sharedWithEmail ||
      (payload.sharedWithAttorneyId
        ? (await prisma.attorney.findUnique({
            where: { id: payload.sharedWithAttorneyId },
            select: { email: true }
          }))?.email || ''
        : '')
    await createNotification(
      recipientEmail,
      'New case share request',
      `A case has been shared with you for review.`,
      { shareId: share.id, assessmentId: auth.lead.assessmentId }
    )
    res.json(share)
  } catch (error: any) {
    logger.error('Failed to create case share', { error: error.message })
    res.status(500).json({ error: 'Failed to create case share' })
  }
})

router.post('/case-shares/:shareId/accept', authMiddleware, async (req: any, res) => {
  try {
    const { shareId } = req.params
    const auth = await getAttorneyFromReq(req)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }

    const share = await prisma.caseShare.findUnique({ where: { id: shareId } })
    if (!share) {
      return res.status(404).json({ error: 'Share not found' })
    }

    const recipientMatch =
      share.sharedWithAttorneyId === auth.attorney.id ||
      (share.sharedWithEmail && auth.attorney.email && share.sharedWithEmail === auth.attorney.email)

    if (!recipientMatch) {
      return res.status(403).json({ error: 'Not authorized to accept this share' })
    }

    const updated = await prisma.caseShare.update({
      where: { id: shareId },
      data: {
        status: 'accepted',
        sharedWithAttorneyId: share.sharedWithAttorneyId || auth.attorney.id
      }
    })

    const sharer = await prisma.attorney.findUnique({
      where: { id: share.sharedByAttorneyId },
      select: { email: true }
    })
    await createNotification(
      sharer?.email || '',
      'Case share accepted',
      'Your case share request has been accepted.',
      { shareId: updated.id }
    )

    res.json(updated)
  } catch (error: any) {
    logger.error('Failed to accept case share', { error: error.message })
    res.status(500).json({ error: 'Failed to accept case share' })
  }
})

router.post('/case-shares/:shareId/decline', authMiddleware, async (req: any, res) => {
  try {
    const { shareId } = req.params
    const auth = await getAttorneyFromReq(req)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }

    const share = await prisma.caseShare.findUnique({ where: { id: shareId } })
    if (!share) {
      return res.status(404).json({ error: 'Share not found' })
    }

    const recipientMatch =
      share.sharedWithAttorneyId === auth.attorney.id ||
      (share.sharedWithEmail && auth.attorney.email && share.sharedWithEmail === auth.attorney.email)

    if (!recipientMatch) {
      return res.status(403).json({ error: 'Not authorized to decline this share' })
    }

    const updated = await prisma.caseShare.update({
      where: { id: shareId },
      data: { status: 'declined' }
    })

    const sharer = await prisma.attorney.findUnique({
      where: { id: share.sharedByAttorneyId },
      select: { email: true }
    })
    await createNotification(
      sharer?.email || '',
      'Case share declined',
      'Your case share request has been declined.',
      { shareId: updated.id }
    )

    res.json(updated)
  } catch (error: any) {
    logger.error('Failed to decline case share', { error: error.message })
    res.status(500).json({ error: 'Failed to decline case share' })
  }
})

// Referral tracking
router.get('/leads/:leadId/referrals', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth

    const referrals = await prisma.referralAgreement.findMany({
      where: { assessmentId: lead.assessmentId },
      orderBy: { createdAt: 'desc' }
    })
    res.json(referrals)
  } catch (error: any) {
    logger.error('Failed to load referrals', { error: error.message })
    res.status(500).json({ error: 'Failed to load referrals' })
  }
})

router.post('/leads/:leadId/referrals', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const payload = referralSchema.parse(req.body || {})
    const feeSplit = calculateFeeSplit(payload.projectedRecovery, payload.feeSplitPercent)

    const referral = await prisma.referralAgreement.create({
      data: {
        assessmentId: auth.lead.assessmentId,
        referringAttorneyId: auth.attorney.id,
        receivingAttorneyId: payload.receivingAttorneyId || null,
        receivingFirmName: payload.receivingFirmName || null,
        receivingEmail: payload.receivingEmail || null,
        feeSplitPercent: payload.feeSplitPercent ?? null,
        projectedRecovery: payload.projectedRecovery ?? null,
        referringFeeAmount: feeSplit.referringFeeAmount,
        receivingFeeAmount: feeSplit.receivingFeeAmount,
        status: payload.status || 'proposed',
        notes: payload.notes || null
      }
    })
    const recipientEmail =
      payload.receivingEmail ||
      (payload.receivingAttorneyId
        ? (await prisma.attorney.findUnique({
            where: { id: payload.receivingAttorneyId },
            select: { email: true }
          }))?.email || ''
        : '')
    await createNotification(
      recipientEmail,
      'New referral request',
      'A referral request has been sent to you.',
      { referralId: referral.id, assessmentId: auth.lead.assessmentId }
    )
    res.json(referral)
  } catch (error: any) {
    logger.error('Failed to create referral', { error: error.message })
    res.status(500).json({ error: 'Failed to create referral' })
  }
})

router.post('/referrals/:referralId/accept', authMiddleware, async (req: any, res) => {
  try {
    const { referralId } = req.params
    const auth = await getAttorneyFromReq(req)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }

    const referral = await prisma.referralAgreement.findUnique({ where: { id: referralId } })
    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' })
    }

    const recipientMatch =
      referral.receivingAttorneyId === auth.attorney.id ||
      (referral.receivingEmail && auth.attorney.email && referral.receivingEmail === auth.attorney.email)

    if (!recipientMatch) {
      return res.status(403).json({ error: 'Not authorized to accept this referral' })
    }

    const updated = await prisma.referralAgreement.update({
      where: { id: referralId },
      data: {
        status: 'accepted',
        receivingAttorneyId: referral.receivingAttorneyId || auth.attorney.id
      }
    })

    const sharer = await prisma.attorney.findUnique({
      where: { id: referral.referringAttorneyId },
      select: { email: true }
    })
    await createNotification(
      sharer?.email || '',
      'Referral accepted',
      'Your referral request has been accepted.',
      { referralId: updated.id }
    )

    res.json(updated)
  } catch (error: any) {
    logger.error('Failed to accept referral', { error: error.message })
    res.status(500).json({ error: 'Failed to accept referral' })
  }
})

router.post('/referrals/:referralId/decline', authMiddleware, async (req: any, res) => {
  try {
    const { referralId } = req.params
    const auth = await getAttorneyFromReq(req)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }

    const referral = await prisma.referralAgreement.findUnique({ where: { id: referralId } })
    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' })
    }

    const recipientMatch =
      referral.receivingAttorneyId === auth.attorney.id ||
      (referral.receivingEmail && auth.attorney.email && referral.receivingEmail === auth.attorney.email)

    if (!recipientMatch) {
      return res.status(403).json({ error: 'Not authorized to decline this referral' })
    }

    const updated = await prisma.referralAgreement.update({
      where: { id: referralId },
      data: { status: 'declined' }
    })

    const sharer = await prisma.attorney.findUnique({
      where: { id: referral.referringAttorneyId },
      select: { email: true }
    })
    await createNotification(
      sharer?.email || '',
      'Referral declined',
      'Your referral request has been declined.',
      { referralId: updated.id }
    )

    res.json(updated)
  } catch (error: any) {
    logger.error('Failed to decline referral', { error: error.message })
    res.status(500).json({ error: 'Failed to decline referral' })
  }
})

router.patch('/leads/:leadId/referrals/:referralId', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, referralId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const payload = referralSchema.parse(req.body || {})
    const feeSplit = calculateFeeSplit(payload.projectedRecovery, payload.feeSplitPercent)

    const referral = await prisma.referralAgreement.update({
      where: { id: referralId },
      data: {
        receivingAttorneyId: payload.receivingAttorneyId || undefined,
        receivingFirmName: payload.receivingFirmName || undefined,
        receivingEmail: payload.receivingEmail || undefined,
        feeSplitPercent: payload.feeSplitPercent ?? undefined,
        projectedRecovery: payload.projectedRecovery ?? undefined,
        referringFeeAmount: feeSplit.referringFeeAmount ?? undefined,
        receivingFeeAmount: feeSplit.receivingFeeAmount ?? undefined,
        status: payload.status || undefined,
        notes: payload.notes || undefined
      }
    })
    res.json(referral)
  } catch (error: any) {
    logger.error('Failed to update referral', { error: error.message })
    res.status(500).json({ error: 'Failed to update referral' })
  }
})

// Co-counsel workflows
router.get('/leads/:leadId/co-counsel', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth

    const workflows = await prisma.coCounselWorkflow.findMany({
      where: { assessmentId: lead.assessmentId },
      orderBy: { createdAt: 'desc' }
    })
    res.json(workflows)
  } catch (error: any) {
    logger.error('Failed to load co-counsel workflows', { error: error.message })
    res.status(500).json({ error: 'Failed to load co-counsel workflows' })
  }
})

router.post('/leads/:leadId/co-counsel', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const payload = coCounselSchema.parse(req.body || {})
    const feeSplit = calculateFeeSplit(payload.projectedRecovery, payload.feeSplitPercent)

    const workflow = await prisma.coCounselWorkflow.create({
      data: {
        assessmentId: auth.lead.assessmentId,
        leadAttorneyId: auth.attorney.id,
        coCounselAttorneyId: payload.coCounselAttorneyId || null,
        coCounselFirmName: payload.coCounselFirmName || null,
        coCounselEmail: payload.coCounselEmail || null,
        feeSplitPercent: payload.feeSplitPercent ?? null,
        projectedRecovery: payload.projectedRecovery ?? null,
        leadFeeAmount: feeSplit.referringFeeAmount,
        coCounselFeeAmount: feeSplit.receivingFeeAmount,
        workflowStatus: payload.workflowStatus || 'initiated',
        nextStep: payload.nextStep || null,
        notes: payload.notes || null
      }
    })
    const recipientEmail =
      payload.coCounselEmail ||
      (payload.coCounselAttorneyId
        ? (await prisma.attorney.findUnique({
            where: { id: payload.coCounselAttorneyId },
            select: { email: true }
          }))?.email || ''
        : '')
    await createNotification(
      recipientEmail,
      'New co-counsel request',
      'A co-counsel workflow has been created for you.',
      { workflowId: workflow.id, assessmentId: auth.lead.assessmentId }
    )
    res.json(workflow)
  } catch (error: any) {
    logger.error('Failed to create co-counsel workflow', { error: error.message })
    res.status(500).json({ error: 'Failed to create co-counsel workflow' })
  }
})

router.post('/co-counsel/:workflowId/accept', authMiddleware, async (req: any, res) => {
  try {
    const { workflowId } = req.params
    const auth = await getAttorneyFromReq(req)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }

    const workflow = await prisma.coCounselWorkflow.findUnique({ where: { id: workflowId } })
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    const recipientMatch =
      workflow.coCounselAttorneyId === auth.attorney.id ||
      (workflow.coCounselEmail && auth.attorney.email && workflow.coCounselEmail === auth.attorney.email)

    if (!recipientMatch) {
      return res.status(403).json({ error: 'Not authorized to accept this workflow' })
    }

    const updated = await prisma.coCounselWorkflow.update({
      where: { id: workflowId },
      data: {
        workflowStatus: 'active',
        coCounselAttorneyId: workflow.coCounselAttorneyId || auth.attorney.id
      }
    })

    const sharer = await prisma.attorney.findUnique({
      where: { id: workflow.leadAttorneyId },
      select: { email: true }
    })
    await createNotification(
      sharer?.email || '',
      'Co-counsel accepted',
      'Your co-counsel request has been accepted.',
      { workflowId: updated.id }
    )

    res.json(updated)
  } catch (error: any) {
    logger.error('Failed to accept co-counsel workflow', { error: error.message })
    res.status(500).json({ error: 'Failed to accept co-counsel workflow' })
  }
})

router.post('/co-counsel/:workflowId/decline', authMiddleware, async (req: any, res) => {
  try {
    const { workflowId } = req.params
    const auth = await getAttorneyFromReq(req)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }

    const workflow = await prisma.coCounselWorkflow.findUnique({ where: { id: workflowId } })
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    const recipientMatch =
      workflow.coCounselAttorneyId === auth.attorney.id ||
      (workflow.coCounselEmail && auth.attorney.email && workflow.coCounselEmail === auth.attorney.email)

    if (!recipientMatch) {
      return res.status(403).json({ error: 'Not authorized to decline this workflow' })
    }

    const updated = await prisma.coCounselWorkflow.update({
      where: { id: workflowId },
      data: { workflowStatus: 'declined' }
    })

    const sharer = await prisma.attorney.findUnique({
      where: { id: workflow.leadAttorneyId },
      select: { email: true }
    })
    await createNotification(
      sharer?.email || '',
      'Co-counsel declined',
      'Your co-counsel request has been declined.',
      { workflowId: updated.id }
    )

    res.json(updated)
  } catch (error: any) {
    logger.error('Failed to decline co-counsel workflow', { error: error.message })
    res.status(500).json({ error: 'Failed to decline co-counsel workflow' })
  }
})

router.patch('/leads/:leadId/co-counsel/:workflowId', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, workflowId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const payload = coCounselSchema.parse(req.body || {})
    const feeSplit = calculateFeeSplit(payload.projectedRecovery, payload.feeSplitPercent)

    const workflow = await prisma.coCounselWorkflow.update({
      where: { id: workflowId },
      data: {
        coCounselAttorneyId: payload.coCounselAttorneyId || undefined,
        coCounselFirmName: payload.coCounselFirmName || undefined,
        coCounselEmail: payload.coCounselEmail || undefined,
        feeSplitPercent: payload.feeSplitPercent ?? undefined,
        projectedRecovery: payload.projectedRecovery ?? undefined,
        leadFeeAmount: feeSplit.referringFeeAmount ?? undefined,
        coCounselFeeAmount: feeSplit.receivingFeeAmount ?? undefined,
        workflowStatus: payload.workflowStatus || undefined,
        nextStep: payload.nextStep || undefined,
        notes: payload.notes || undefined
      }
    })
    res.json(workflow)
  } catch (error: any) {
    logger.error('Failed to update co-counsel workflow', { error: error.message })
    res.status(500).json({ error: 'Failed to update co-counsel workflow' })
  }
})

// Data room export for litigation finance
router.get('/leads/:leadId/finance/dataroom', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth

    const assessment = await prisma.assessment.findUnique({
      where: { id: lead.assessmentId },
      include: {
        predictions: true,
        files: true,
        evidenceFiles: true,
        demandLetters: true,
        insuranceDetails: true,
        lienHolders: true,
        caseTasks: true,
        negotiationEvents: true,
        caseNotes: true,
        billingInvoices: true,
        billingPayments: true
      }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    const facts = safeJsonParse<any>(assessment.facts, {})
    const injuries = Array.isArray(facts.injuries) ? facts.injuries : []
    const treatment = Array.isArray(facts.treatment) ? facts.treatment : []
    const damages = facts.damages || {}
    const medicalDamages = Number(damages.medical || damages.medicalExpenses || 0)
    const wageDamages = Number(damages.lostWages || damages.wageLoss || 0)
    const otherDamages = Number(damages.other || 0)
    const prediction = pickLatestPrediction(assessment.predictions)
    const bands = safeJsonParse<any>(prediction?.bands, {})
    const viability = safeJsonParse<any>(prediction?.viability, {})
    const viabilityScore = typeof viability?.overall === 'number' ? viability.overall : null

    const evidenceCount = assessment.evidenceFiles?.length || 0
    const fileCount = assessment.files?.length || 0
    const demandLetters = assessment.demandLetters || []
    const insuranceLimits = (assessment.insuranceDetails || [])
      .map((detail: any) => detail.policyLimit)
      .filter((limit: any) => typeof limit === 'number')
    const insuranceLimit = insuranceLimits.length > 0
      ? insuranceLimits.reduce((sum: number, limit: number) => sum + limit, 0)
      : null

    const lienTotal = (assessment.lienHolders || [])
      .map((lien: any) => lien.amount)
      .filter((amount: any) => typeof amount === 'number')
      .reduce((sum: number, amount: number) => sum + amount, 0)
    const openTaskCount = (assessment.caseTasks || []).filter((task: any) => task.status !== 'completed').length
    const negotiationCount = assessment.negotiationEvents?.length || 0
    const noteCount = assessment.caseNotes?.length || 0
    const invoiceTotal = (assessment.billingInvoices || [])
      .map((inv: any) => inv.amount)
      .filter((amount: any) => typeof amount === 'number')
      .reduce((sum: number, amount: number) => sum + amount, 0)
    const paymentTotal = (assessment.billingPayments || [])
      .map((p: any) => p.amount)
      .filter((amount: any) => typeof amount === 'number')
      .reduce((sum: number, amount: number) => sum + amount, 0)

    const { riskScore, riskLevel } = buildRiskProfile({
      evidenceCount,
      injuryCount: injuries.length,
      treatmentCount: treatment.length,
      insuranceLimit,
      viabilityScore
    })

    const summary = {
      leadId: lead.id,
      assessmentId: assessment.id,
      claimType: assessment.claimType,
      venueState: assessment.venueState || facts?.venue?.state || null,
      status: lead.status,
      incidentDate: facts?.incident?.date || null,
      injuriesCount: injuries.length,
      treatmentCount: treatment.length,
      evidenceCount,
      fileCount,
      demandLettersCount: demandLetters.length,
      insuranceLimit,
      lienTotal,
      openTaskCount,
      negotiationCount,
      noteCount
    }

    const underwriting = {
      claimType: summary.claimType,
      venueState: summary.venueState,
      incidentDate: summary.incidentDate,
      injuriesSummary: injuries,
      treatmentSummary: treatment,
      damages: {
        medical: medicalDamages,
        lostWages: wageDamages,
        other: otherDamages
      },
      evidenceCount,
      demandTarget: demandLetters[0]?.targetAmount || null,
      insuranceLimit,
      lienTotal,
      invoiceTotal,
      paymentTotal,
      viabilityScore,
      openTaskCount,
      negotiationCount,
      noteCount
    }

    const riskProfile = {
      riskScore,
      riskLevel,
      expectedValue: typeof bands?.median === 'number' ? bands.median : 0,
      downside: typeof bands?.p25 === 'number' ? bands.p25 : 0,
      upside: typeof bands?.p75 === 'number' ? bands.p75 : 0
    }

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename=dataroom-${leadId}.zip`)

    const archive = archiver('zip', { zlib: { level: 9 } })
    archive.on('error', (err: Error) => {
      logger.error('Failed to build dataroom zip', { error: err.message, leadId })
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to build dataroom export' })
      }
    })
    archive.pipe(res)

    const included: Array<{ name: string; source: string }> = []
    const missing: Array<{ name: string; source: string }> = []

    const addFile = (filePath: string, archivePath: string, source: string) => {
      const resolved = resolveStoragePath(filePath)
      if (fs.existsSync(resolved)) {
        archive.file(resolved, { name: archivePath })
        included.push({ name: archivePath, source })
      } else {
        missing.push({ name: archivePath, source })
      }
    }

    for (const file of assessment.files || []) {
      const archivePath = path.posix.join('assessment-files', file.originalName || file.filename)
      addFile(file.path, archivePath, 'assessment')
    }

    const medicalSharing = buildMedicalSharingStatus(assessment)
    const evidenceFilesForExport = medicalSharing.canShareMedicalData
      ? assessment.evidenceFiles || []
      : (assessment.evidenceFiles || []).filter((file: any) => !isMedicalEvidenceFile(file))

    for (const file of evidenceFilesForExport) {
      const archivePath = path.posix.join('evidence-files', file.originalName || file.filename)
      addFile(file.filePath, archivePath, 'evidence')
    }

    archive.append(Buffer.from(JSON.stringify(summary, null, 2)), { name: 'case-packaging.json' })
    archive.append(Buffer.from(JSON.stringify(underwriting, null, 2)), { name: 'underwriting-view.json' })
    archive.append(Buffer.from(JSON.stringify(riskProfile, null, 2)), { name: 'risk-return-profile.json' })

    const manifest = {
      leadId,
      assessmentId: assessment.id,
      includedCount: included.length,
      missingCount: missing.length,
      included,
      missing,
      medicalSharing
    }
    archive.append(Buffer.from(JSON.stringify(manifest, null, 2)), { name: 'manifest.json' })

    await archive.finalize()
  } catch (error: any) {
    logger.error('Failed to export dataroom', { error: error.message })
    res.status(500).json({ error: 'Failed to export dataroom' })
  }
})

// Underwriting PDF export for litigation finance
router.get('/leads/:leadId/finance/underwriting/pdf', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth

    const assessment = await prisma.assessment.findUnique({
      where: { id: lead.assessmentId },
      include: {
        predictions: true,
        evidenceFiles: true,
        demandLetters: true,
        insuranceDetails: true,
        lienHolders: true,
        caseTasks: true,
        negotiationEvents: true,
        caseNotes: true
      }
    })

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }

    const facts = safeJsonParse<any>(assessment.facts, {})
    const injuries = Array.isArray(facts.injuries) ? facts.injuries : []
    const treatment = Array.isArray(facts.treatment) ? facts.treatment : []
    const damages = facts.damages || {}
    const prediction = pickLatestPrediction(assessment.predictions)
    const bands = safeJsonParse<any>(prediction?.bands, {})
    const viability = safeJsonParse<any>(prediction?.viability, {})
    const viabilityScore = typeof viability?.overall === 'number' ? viability.overall : null

    const evidenceCount = assessment.evidenceFiles?.length || 0
    const demandTarget = assessment.demandLetters?.[0]?.targetAmount || null
    const insuranceLimits = (assessment.insuranceDetails || [])
      .map((detail: any) => detail.policyLimit)
      .filter((limit: any) => typeof limit === 'number')
    const insuranceLimit = insuranceLimits.length > 0
      ? insuranceLimits.reduce((sum: number, limit: number) => sum + limit, 0)
      : null
    const lienTotal = (assessment.lienHolders || [])
      .map((lien: any) => lien.amount)
      .filter((amount: any) => typeof amount === 'number')
      .reduce((sum: number, amount: number) => sum + amount, 0)
    const openTaskCount = (assessment.caseTasks || []).filter((task: any) => task.status !== 'completed').length
    const negotiationCount = assessment.negotiationEvents?.length || 0
    const noteCount = assessment.caseNotes?.length || 0

    const { riskScore, riskLevel } = buildRiskProfile({
      evidenceCount,
      injuryCount: injuries.length,
      treatmentCount: treatment.length,
      insuranceLimit,
      viabilityScore
    })

    const doc = new PDFDocument({ margin: 50 })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=underwriting-${leadId}.pdf`)
    doc.pipe(res)

    doc.fontSize(18).text('ClearCaseIQ Underwriting Summary', { underline: true })
    doc.moveDown()
    doc.fontSize(11).text(`Lead ID: ${lead.id}`)
    doc.text(`Assessment ID: ${assessment.id}`)
    doc.text(`Claim Type: ${assessment.claimType}`)
    doc.text(`Venue State: ${assessment.venueState || facts?.venue?.state || 'N/A'}`)
    doc.text(`Incident Date: ${facts?.incident?.date || 'N/A'}`)
    doc.moveDown()

    doc.fontSize(13).text('Risk / Return Profile', { underline: true })
    doc.fontSize(11)
      .text(`Risk Score: ${riskScore} (${riskLevel})`)
      .text(`Expected Value: ${bands?.median ?? 0}`)
      .text(`Range: ${bands?.p25 ?? 0} – ${bands?.p75 ?? 0}`)
      .text(`Viability Score: ${viabilityScore ?? 'N/A'}`)
    doc.moveDown()

    doc.fontSize(13).text('Underwriting Snapshot', { underline: true })
    doc.fontSize(11)
      .text(`Evidence Files: ${evidenceCount}`)
      .text(`Injuries Count: ${injuries.length}`)
      .text(`Treatment Count: ${treatment.length}`)
      .text(`Demand Target: ${demandTarget ?? 'N/A'}`)
      .text(`Insurance Limit: ${insuranceLimit ?? 'N/A'}`)
      .text(`Lien Total: ${lienTotal ?? 0}`)
      .text(`Open Tasks: ${openTaskCount}`)
      .text(`Negotiation Events: ${negotiationCount}`)
      .text(`Case Notes: ${noteCount}`)
    doc.moveDown()

    doc.fontSize(13).text('Damages Summary', { underline: true })
    doc.fontSize(11)
      .text(`Medical: ${Number(damages.medical || damages.medicalExpenses || 0)}`)
      .text(`Lost Wages: ${Number(damages.lostWages || damages.wageLoss || 0)}`)
      .text(`Other: ${Number(damages.other || 0)}`)

    doc.end()
  } catch (error: any) {
    logger.error('Failed to export underwriting pdf', { error: error.message })
    res.status(500).json({ error: 'Failed to export underwriting pdf' })
  }
})

// Insurance details
router.get('/leads/:leadId/insurance', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth

    const records = await prisma.insuranceDetail.findMany({
      where: { assessmentId: lead.assessmentId },
      orderBy: { createdAt: 'desc' },
      select: insuranceDetailSelect
    })
    res.json(records)
  } catch (error: any) {
    logger.error('Failed to load insurance details', { error: error.message })
    res.status(500).json({ error: 'Failed to load insurance details' })
  }
})

// Suggested insurance prefill + claim-type, derived from the plaintiff's intake
// answers (defendant insured?, policy limit, UM/UIM). Read-only; the attorney
// decides whether to apply it.
router.get('/leads/:leadId/insurance/suggestion', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth

    const assessment = await prisma.assessment.findUnique({
      where: { id: lead.assessmentId },
      select: { facts: true }
    })
    let facts: any = {}
    try {
      facts = assessment?.facts ? JSON.parse(assessment.facts) : {}
    } catch {
      facts = {}
    }
    res.json(buildInsuranceClaimSuggestion(facts))
  } catch (error: any) {
    logger.error('Failed to build insurance suggestion', { error: error.message })
    res.status(500).json({ error: 'Failed to build insurance suggestion' })
  }
})

router.post('/leads/:leadId/insurance', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth
    const {
      carrierName,
      policyNumber,
      policyLimit,
      adjusterName,
      adjusterEmail,
      adjusterPhone,
      notes,
      insuredParty,
      coverageType,
      claimNumber,
      claimStatus,
      coverageConfirmed,
      createWorkflowTasks
    } = req.body

    if (!carrierName) {
      return res.status(400).json({ error: 'carrierName is required' })
    }

    const normalizedClaimStatus = normalizeEnum(claimStatus, CLAIM_STATUSES) ?? 'not_opened'

    const record = await prisma.insuranceDetail.create({
      data: {
        assessmentId: lead.assessmentId,
        carrierName,
        policyNumber: policyNumber || null,
        policyLimit: policyLimit ? Number(policyLimit) : null,
        adjusterName: adjusterName || null,
        adjusterEmail: adjusterEmail || null,
        adjusterPhone: adjusterPhone || null,
        notes: notes || null,
        insuredParty: normalizeEnum(insuredParty, INSURED_PARTIES),
        coverageType: normalizeEnum(coverageType, COVERAGE_TYPES),
        claimNumber: claimNumber || null,
        claimStatus: normalizedClaimStatus,
        claimOpenedAt: normalizedClaimStatus !== 'not_opened' ? new Date() : null,
        coverageConfirmed: Boolean(coverageConfirmed)
      },
      select: insuranceDetailSelect
    })

    // Seed the recovery-path checklist so the attorney has the next two concrete
    // steps (confirm coverage via the Dec Page, then open the claim) on the board.
    if (createWorkflowTasks !== false) {
      const carrierLabel = record.carrierName
      await prisma.caseTask.createMany({
        data: [
          {
            assessmentId: lead.assessmentId,
            title: `Request Dec Page from ${carrierLabel}`,
            taskType: 'general',
            assignedRole: 'paralegal',
            priority: 'high',
            notes: 'Confirms available coverage (the ceiling on recovery).'
          },
          {
            assessmentId: lead.assessmentId,
            title: `Open claim with ${carrierLabel} and record claim number`,
            taskType: 'general',
            assignedRole: 'paralegal',
            priority: 'high',
            notes: 'Open the claim with the adjuster and capture the claim number.'
          }
        ]
      })
    }

    res.json(record)
  } catch (error: any) {
    logger.error('Failed to create insurance detail', { error: error.message })
    res.status(500).json({ error: 'Failed to create insurance detail' })
  }
})

router.patch('/leads/:leadId/insurance/:id', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, id } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const {
      carrierName,
      policyNumber,
      policyLimit,
      adjusterName,
      adjusterEmail,
      adjusterPhone,
      notes,
      insuredParty,
      coverageType,
      claimNumber,
      claimStatus,
      coverageConfirmed
    } = req.body

    // When the claim moves off "not_opened" for the first time, stamp the opened
    // date; clear it if the claim is reset to not_opened.
    let claimOpenedAtPatch: Record<string, Date | null> = {}
    if (claimStatus !== undefined) {
      const normalized = normalizeEnum(claimStatus, CLAIM_STATUSES) ?? 'not_opened'
      const existing = await prisma.insuranceDetail.findUnique({
        where: { id },
        select: { claimOpenedAt: true }
      })
      if (normalized === 'not_opened') {
        claimOpenedAtPatch = { claimOpenedAt: null }
      } else if (!existing?.claimOpenedAt) {
        claimOpenedAtPatch = { claimOpenedAt: new Date() }
      }
    }

    const record = await prisma.insuranceDetail.update({
      where: { id },
      data: {
        ...(carrierName !== undefined ? { carrierName } : {}),
        ...(policyNumber !== undefined ? { policyNumber } : {}),
        ...(policyLimit !== undefined ? { policyLimit: policyLimit ? Number(policyLimit) : null } : {}),
        ...(adjusterName !== undefined ? { adjusterName } : {}),
        ...(adjusterEmail !== undefined ? { adjusterEmail } : {}),
        ...(adjusterPhone !== undefined ? { adjusterPhone } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(insuredParty !== undefined ? { insuredParty: normalizeEnum(insuredParty, INSURED_PARTIES) } : {}),
        ...(coverageType !== undefined ? { coverageType: normalizeEnum(coverageType, COVERAGE_TYPES) } : {}),
        ...(claimNumber !== undefined ? { claimNumber: claimNumber || null } : {}),
        ...(claimStatus !== undefined ? { claimStatus: normalizeEnum(claimStatus, CLAIM_STATUSES) ?? 'not_opened' } : {}),
        ...(coverageConfirmed !== undefined ? { coverageConfirmed: Boolean(coverageConfirmed) } : {}),
        ...claimOpenedAtPatch
      },
      select: insuranceDetailSelect
    })
    res.json(record)
  } catch (error: any) {
    logger.error('Failed to update insurance detail', { error: error.message })
    res.status(500).json({ error: 'Failed to update insurance detail' })
  }
})

router.delete('/leads/:leadId/insurance/:id', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, id } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    await prisma.insuranceDetail.delete({ where: { id } })
    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Failed to delete insurance detail', { error: error.message })
    res.status(500).json({ error: 'Failed to delete insurance detail' })
  }
})

// Request the Dec Page (declarations page) from an insurer to confirm available
// coverage. Reuses the opposing-party tokenized upload portal so the insurer,
// who has no platform account, can upload securely, and links the resulting
// DocumentRequest back to the insurance record.
router.post('/leads/:leadId/insurance/:id/request-dec-page', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, id } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead, attorney } = auth

    const insurance = await prisma.insuranceDetail.findFirst({
      where: { id, assessmentId: lead.assessmentId },
      select: insuranceDetailSelect
    })
    if (!insurance) {
      return res.status(404).json({ error: 'Insurance record not found' })
    }

    const recipientName = (req.body?.recipientName || insurance.carrierName || '').trim()
    const recipientEmail = (req.body?.recipientEmail || insurance.adjusterEmail || '').trim()
    const customMessage = req.body?.customMessage || null
    if (!recipientName) {
      return res.status(400).json({ error: 'recipientName (or a carrier name) is required' })
    }

    const secureToken = crypto.randomUUID()
    const baseUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000'
    const uploadLink = `${baseUrl}/respond/documents/${secureToken}`

    const docRequest = await prisma.documentRequest.create({
      data: {
        leadId,
        attorneyId: attorney.id,
        requestedDocs: JSON.stringify(['dec_page']),
        customMessage,
        secureToken,
        uploadLink,
        status: 'pending',
        targetType: 'opposing_party',
        recipientName,
        recipientEmail: recipientEmail || null,
        recipientRole: 'insurer',
        origin: 'attorney',
      },
    })

    const updated = await prisma.insuranceDetail.update({
      where: { id },
      data: { decPageRequestId: docRequest.id },
      select: insuranceDetailSelect
    })

    if (recipientEmail) {
      const attorneyName = attorney.name || 'the attorney'
      const subject = `Declarations page request — ${attorneyName}`
      const message = `Hello ${recipientName},\n\n${attorneyName} requests the declarations (Dec) page confirming the available coverage limits for this claim.\n\n${customMessage ? `${customMessage}\n\n` : ''}Please upload it securely here:\n${uploadLink}\n\nThis is a secure, single-purpose link. If you believe you received this in error, please disregard it.\n\nRegards,\nClearCaseIQ on behalf of ${attorneyName}`
      await createNotification(recipientEmail, subject, message, {
        leadId,
        assessmentId: lead.assessmentId,
        documentRequestId: docRequest.id,
        targetType: 'opposing_party',
        uploadLink,
      })
    }

    res.json({ insurance: updated, documentRequest: { ...docRequest, requestedDocs: ['dec_page'] } })
  } catch (error: any) {
    logger.error('Failed to request Dec Page', { error: error.message })
    res.status(500).json({ error: 'Failed to request Dec Page' })
  }
})

// Lien holders
router.get('/leads/:leadId/liens', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth

    const records = await prisma.lienHolder.findMany({
      where: { assessmentId: lead.assessmentId },
      orderBy: { createdAt: 'desc' },
      select: lienHolderSelect
    })
    res.json(records)
  } catch (error: any) {
    logger.error('Failed to load lien holders', { error: error.message })
    res.status(500).json({ error: 'Failed to load lien holders' })
  }
})

router.post('/leads/:leadId/liens', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth
    const { name, type, amount, status, notes } = req.body

    if (!name) {
      return res.status(400).json({ error: 'name is required' })
    }

    const record = await prisma.lienHolder.create({
      data: {
        assessmentId: lead.assessmentId,
        name,
        type: type || null,
        amount: amount ? Number(amount) : null,
        status: status || 'open',
        notes: notes || null
      },
      select: lienHolderSelect
    })
    res.json(record)
  } catch (error: any) {
    logger.error('Failed to create lien holder', { error: error.message })
    res.status(500).json({ error: 'Failed to create lien holder' })
  }
})

router.patch('/leads/:leadId/liens/:id', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, id } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { name, type, amount, status, notes } = req.body

    const record = await prisma.lienHolder.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(amount !== undefined ? { amount: amount ? Number(amount) : null } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(notes !== undefined ? { notes } : {})
      },
      select: lienHolderSelect
    })
    res.json(record)
  } catch (error: any) {
    logger.error('Failed to update lien holder', { error: error.message })
    res.status(500).json({ error: 'Failed to update lien holder' })
  }
})

router.delete('/leads/:leadId/liens/:id', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, id } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    await prisma.lienHolder.delete({ where: { id } })
    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Failed to delete lien holder', { error: error.message })
    res.status(500).json({ error: 'Failed to delete lien holder' })
  }
})

// Case tasks
router.get('/leads/:leadId/tasks', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth

    const records = await prisma.caseTask.findMany({
      where: { assessmentId: lead.assessmentId },
      orderBy: { createdAt: 'desc' },
      select: caseTaskSelect
    })
    res.json(records)
  } catch (error: any) {
    logger.error('Failed to load case tasks', { error: error.message })
    res.status(500).json({ error: 'Failed to load case tasks' })
  }
})

router.post('/leads/:leadId/tasks', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth
    const {
      title,
      dueDate,
      priority,
      status,
      notes,
      taskType,
      milestoneType,
      checkpointType,
      deadlineType,
      assignedRole,
      assignedTo,
      reminderAt,
      escalationLevel,
      sourceTemplateId,
      sourceTemplateStepId
    } = req.body

    if (!title) {
      return res.status(400).json({ error: 'title is required' })
    }

    const record = await prisma.caseTask.create({
      data: {
        assessmentId: lead.assessmentId,
        title,
        dueDate: dueDate ? new Date(dueDate) : null,
        reminderAt: reminderAt ? new Date(reminderAt) : null,
        priority: priority || 'medium',
        status: status || 'open',
        notes: notes || null,
        taskType: taskType || 'general',
        milestoneType: milestoneType || null,
        checkpointType: checkpointType || null,
        deadlineType: deadlineType || null,
        assignedRole: assignedRole || null,
        assignedTo: assignedTo || null,
        escalationLevel: escalationLevel || 'none',
        sourceTemplateId: sourceTemplateId || null,
        sourceTemplateStepId: sourceTemplateStepId || null
      },
      select: caseTaskSelect
    })
    await scheduleTaskReminder(record.assessmentId, {
      title: record.title,
      dueDate: record.dueDate,
      reminderAt: record.reminderAt
    })
    await scheduleEscalationAlert(record.assessmentId, {
      title: record.title,
      dueDate: record.dueDate,
      escalationLevel: record.escalationLevel
    })
    res.json(record)
  } catch (error: any) {
    logger.error('Failed to create case task', { error: error.message })
    res.status(500).json({ error: 'Failed to create case task' })
  }
})

router.post('/leads/:leadId/tasks/from-readiness', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead, attorney } = auth
    const { tasks: created } = await createReadinessTasks(leadId, lead.assessmentId)
    await Promise.all(
      created.map((task) => writeAutomationAudit({
        userId: req.user?.id || null,
        attorneyId: attorney.id,
        action: 'automation_task_created',
        entityType: 'automation_task',
        entityId: task.id,
        metadata: {
          leadId,
          assessmentId: lead.assessmentId,
          title: task.title,
        },
      })),
    )

    res.json({
      createdCount: created.length,
      tasks: created,
      summary: created.length > 0
        ? 'Created blocker-driven tasks from the latest readiness snapshot.'
        : 'No new blocker-driven tasks were needed.',
    })
  } catch (error: any) {
    logger.error('Failed to create readiness tasks', { error: error.message })
    res.status(500).json({ error: 'Failed to create readiness tasks' })
  }
})

router.post('/leads/:leadId/readiness/sync', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead, attorney } = auth
    const result = await syncReadinessAutomation(leadId, lead.assessmentId)
    await Promise.all([
      ...result.tasks.map((task) => writeAutomationAudit({
        userId: req.user?.id || null,
        attorneyId: attorney.id,
        action: 'automation_task_created',
        entityType: 'automation_task',
        entityId: task.id,
        metadata: {
          leadId,
          assessmentId: lead.assessmentId,
          title: task.title,
        },
      })),
      ...result.reminders.map((reminder) => writeAutomationAudit({
        userId: req.user?.id || null,
        attorneyId: attorney.id,
        action: 'automation_feed_created',
        entityType: 'automation_feed',
        entityId: reminder.id,
        metadata: {
          leadId,
          assessmentId: lead.assessmentId,
          dueAt: reminder.dueAt,
          message: reminder.message,
        },
      })),
    ])
    res.json({
      createdTaskCount: result.tasks.length,
      createdReminderCount: result.reminders.length,
      tasks: result.tasks,
      reminders: result.reminders,
      readiness: {
        score: result.summary.readiness.score,
        label: result.summary.readiness.label,
        actionType: result.summary.nextBestAction.actionType,
      },
    })
  } catch (error: any) {
    logger.error('Failed to sync readiness automation', { error: error.message })
    res.status(500).json({ error: 'Failed to sync readiness automation' })
  }
})

router.patch('/leads/:leadId/tasks/:id', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, id } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const {
      title,
      dueDate,
      priority,
      status,
      notes,
      taskType,
      milestoneType,
      checkpointType,
      deadlineType,
      assignedRole,
      assignedTo,
      reminderAt,
      escalationLevel
    } = req.body

    const record = await prisma.caseTask.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(taskType !== undefined ? { taskType } : {}),
        ...(milestoneType !== undefined ? { milestoneType } : {}),
        ...(checkpointType !== undefined ? { checkpointType } : {}),
        ...(deadlineType !== undefined ? { deadlineType } : {}),
        ...(assignedRole !== undefined ? { assignedRole } : {}),
        ...(assignedTo !== undefined ? { assignedTo } : {}),
        ...(reminderAt !== undefined ? { reminderAt: reminderAt ? new Date(reminderAt) : null } : {}),
        ...(escalationLevel !== undefined ? { escalationLevel } : {}),
        ...(status === 'done' ? { completedAt: new Date() } : {})
      },
      select: caseTaskSelect
    })
    await scheduleTaskReminder(record.assessmentId, {
      title: record.title,
      dueDate: record.dueDate,
      reminderAt: record.reminderAt
    })
    await scheduleEscalationAlert(record.assessmentId, {
      title: record.title,
      dueDate: record.dueDate,
      escalationLevel: record.escalationLevel
    })
    res.json(record)
  } catch (error: any) {
    logger.error('Failed to update case task', { error: error.message })
    res.status(500).json({ error: 'Failed to update case task' })
  }
})

router.delete('/leads/:leadId/tasks/:id', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, id } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    await prisma.caseTask.delete({ where: { id } })
    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Failed to delete case task', { error: error.message })
    res.status(500).json({ error: 'Failed to delete case task' })
  }
})

router.post('/leads/:leadId/tasks/sol', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth

    const assessment = await prisma.assessment.findUnique({
      where: { id: lead.assessmentId }
    })
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' })
    }
    const facts = assessment.facts ? JSON.parse(assessment.facts) : {}
    const incidentDate = facts?.incident?.date
    const venueState = assessment.venueState
    const claimType = assessment.claimType

    if (!incidentDate || !venueState || !claimType) {
      return res.status(400).json({ error: 'Missing incident date, venue state, or claim type' })
    }

    const sol = calculateSOL(incidentDate, { state: venueState }, claimType)
    const status = getSOLStatus(sol.daysRemaining)
    const title = `Statute of limitations (${venueState} • ${claimType})`
    const record = await prisma.caseTask.create({
      data: {
        assessmentId: lead.assessmentId,
        title,
        taskType: 'statute',
        deadlineType: 'sol',
        dueDate: sol.expiresAt,
        priority: status === 'critical' ? 'high' : status === 'warning' ? 'medium' : 'low',
        escalationLevel: status === 'critical' ? 'critical' : status === 'warning' ? 'warning' : 'none',
        notes: sol.rule?.notes || null
      },
      select: caseTaskSelect
    })

    await scheduleTaskReminder(lead.assessmentId, {
      title: record.title,
      dueDate: record.dueDate,
      reminderAt: record.reminderAt
    })
    await scheduleEscalationAlert(lead.assessmentId, {
      title: record.title,
      dueDate: record.dueDate,
      escalationLevel: record.escalationLevel
    })

    res.json(record)
  } catch (error: any) {
    logger.error('Failed to create SOL task', { error: error.message })
    res.status(500).json({ error: 'Failed to create SOL task' })
  }
})

const buildNegotiationInsights = (events: any[]) => {
  const sorted = [...events]
    .filter((item) => item.eventDate)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
  const demands = sorted.filter((item) => item.eventType === 'demand')
  const counters = sorted.filter((item) => item.eventType === 'counter')
  const offers = sorted.filter((item) => item.eventType === 'offer')
  const lastEvent = sorted[sorted.length - 1]
  const velocityDays = sorted.length > 1
    ? Math.round((new Date(sorted[sorted.length - 1].eventDate).getTime() - new Date(sorted[0].eventDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const totalConcessions = sorted
    .filter((item) => Number(item.concessionValue))
    .reduce((sum, item) => sum + Number(item.concessionValue || 0), 0)
  const latestOffer = offers[offers.length - 1]?.amount ?? null
  const latestDemand = demands[demands.length - 1]?.amount ?? null
  const gap = latestDemand && latestOffer ? Math.round((latestDemand - latestOffer) / 1000) * 1000 : null
  const adjusterKey = lastEvent?.adjusterName || lastEvent?.insurerName || 'Unknown'
  const adjusterEvents = sorted.filter(
    (item) => item.adjusterName === lastEvent?.adjusterName || item.insurerName === lastEvent?.insurerName
  )
  const acceptanceRate = sorted.length
    ? Math.round((sorted.filter((item) => item.status === 'accepted').length / sorted.length) * 100)
    : 0
  const nextMove = lastEvent?.eventType === 'offer'
    ? 'Counter with rationale and supporting docs'
    : lastEvent?.eventType === 'counter'
      ? 'Hold 3-5 days; prepare demand package'
      : lastEvent?.eventType === 'demand'
        ? 'Follow up in 5-7 days; consider litigation posture'
        : 'Log next contact and request adjuster response'
  const scenario = {
    wait: latestOffer ? Math.round(latestOffer * 1.02) : null,
    push: latestOffer ? Math.round(latestOffer * 1.08) : null,
    litigate: latestDemand ? Math.round(latestDemand * 1.2) : null
  }

  return {
    totals: {
      demandCount: demands.length,
      counterCount: counters.length,
      offerCount: offers.length,
      eventCount: sorted.length
    },
    latest: {
      demand: latestDemand,
      offer: latestOffer
    },
    velocityDays,
    totalConcessions: Math.round(totalConcessions),
    gap,
    adjusterProfile: {
      key: adjusterKey,
      eventCount: adjusterEvents.length,
      acceptanceRate
    },
    nextMove,
    scenario
  }
}

const upsertNegotiationInsights = async (assessmentId: string) => {
  const events = await prisma.negotiationEvent.findMany({
    where: { assessmentId },
    orderBy: { eventDate: 'asc' },
    select: negotiationInsightEventSelect
  })

  if (events.length === 0) {
    await prisma.negotiationInsight.deleteMany({ where: { assessmentId } })
    return
  }

  const data = buildNegotiationInsights(events)
  await prisma.negotiationInsight.upsert({
    where: { assessmentId },
    create: { assessmentId, data: JSON.stringify(data) },
    update: { data: JSON.stringify(data) }
  })
}

// Negotiation tracker
router.get('/leads/:leadId/negotiations', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth

    const records = await prisma.negotiationEvent.findMany({
      where: { assessmentId: lead.assessmentId },
      orderBy: { eventDate: 'desc' },
      select: negotiationEventSelect
    })
    res.json(records)
  } catch (error: any) {
    logger.error('Failed to load negotiation events', { error: error.message })
    res.status(500).json({ error: 'Failed to load negotiation events' })
  }
})

router.post('/leads/:leadId/negotiations', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth
    const {
      eventType,
      amount,
      eventDate,
      status,
      notes,
      counterpartyType,
      insurerName,
      adjusterName,
      adjusterEmail,
      adjusterPhone,
      concessionValue,
      concessionNotes,
      acceptanceRationale
    } = req.body

    if (!eventType) {
      return res.status(400).json({ error: 'eventType is required' })
    }

    const record = await prisma.negotiationEvent.create({
      data: {
        assessmentId: lead.assessmentId,
        eventType,
        amount: amount ? Number(amount) : null,
        eventDate: eventDate ? new Date(eventDate) : new Date(),
        status: status || 'open',
        notes: notes || null,
        counterpartyType: counterpartyType || null,
        insurerName: insurerName || null,
        adjusterName: adjusterName || null,
        adjusterEmail: adjusterEmail || null,
        adjusterPhone: adjusterPhone || null,
        concessionValue: concessionValue ? Number(concessionValue) : null,
        concessionNotes: concessionNotes || null,
        acceptanceRationale: acceptanceRationale || null
      },
      select: negotiationEventSelect
    })
    await upsertNegotiationInsights(lead.assessmentId)
    res.json(record)
  } catch (error: any) {
    logger.error('Failed to create negotiation event', { error: error.message })
    res.status(500).json({ error: 'Failed to create negotiation event' })
  }
})

router.patch('/leads/:leadId/negotiations/:id', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, id } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth
    const {
      eventType,
      amount,
      eventDate,
      status,
      notes,
      counterpartyType,
      insurerName,
      adjusterName,
      adjusterEmail,
      adjusterPhone,
      concessionValue,
      concessionNotes,
      acceptanceRationale
    } = req.body

    const record = await prisma.negotiationEvent.update({
      where: { id },
      data: {
        ...(eventType !== undefined ? { eventType } : {}),
        ...(amount !== undefined ? { amount: amount ? Number(amount) : null } : {}),
        ...(eventDate !== undefined ? { eventDate: eventDate ? new Date(eventDate) : new Date() } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(counterpartyType !== undefined ? { counterpartyType } : {}),
        ...(insurerName !== undefined ? { insurerName } : {}),
        ...(adjusterName !== undefined ? { adjusterName } : {}),
        ...(adjusterEmail !== undefined ? { adjusterEmail } : {}),
        ...(adjusterPhone !== undefined ? { adjusterPhone } : {}),
        ...(concessionValue !== undefined ? { concessionValue: concessionValue ? Number(concessionValue) : null } : {}),
        ...(concessionNotes !== undefined ? { concessionNotes } : {}),
        ...(acceptanceRationale !== undefined ? { acceptanceRationale } : {})
      },
      select: negotiationEventSelect
    })
    await upsertNegotiationInsights(lead.assessmentId)
    res.json(record)
  } catch (error: any) {
    logger.error('Failed to update negotiation event', { error: error.message })
    res.status(500).json({ error: 'Failed to update negotiation event' })
  }
})

router.delete('/leads/:leadId/negotiations/:id', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, id } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth
    await prisma.negotiationEvent.delete({ where: { id } })
    await upsertNegotiationInsights(lead.assessmentId)
    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Failed to delete negotiation event', { error: error.message })
    res.status(500).json({ error: 'Failed to delete negotiation event' })
  }
})

// Team collaboration notes
router.get('/leads/:leadId/notes', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth

    const records = await prisma.caseNote.findMany({
      where: { assessmentId: lead.assessmentId },
      orderBy: { createdAt: 'desc' },
      select: caseNoteSelect
    })
    res.json(records)
  } catch (error: any) {
    logger.error('Failed to load case notes', { error: error.message })
    res.status(500).json({ error: 'Failed to load case notes' })
  }
})

router.post('/leads/:leadId/notes', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead, attorney } = auth
    const { noteType, message } = req.body

    if (!message) {
      return res.status(400).json({ error: 'message is required' })
    }

    const record = await prisma.caseNote.create({
      data: {
        assessmentId: lead.assessmentId,
        authorId: attorney.id,
        authorName: attorney.name || null,
        authorEmail: attorney.email || null,
        noteType: noteType || 'general',
        message
      },
      select: caseNoteSelect
    })
    res.json(record)
  } catch (error: any) {
    logger.error('Failed to create case note', { error: error.message })
    res.status(500).json({ error: 'Failed to create case note' })
  }
})

router.delete('/leads/:leadId/notes/:id', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, id } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    await prisma.caseNote.delete({ where: { id } })
    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Failed to delete case note', { error: error.message })
    res.status(500).json({ error: 'Failed to delete case note' })
  }
})

// Collaboration comments & threads
router.get('/leads/:leadId/comments/threads', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const role = getUserRole(req.user?.email)
    const threads = await prisma.caseCommentThread.findMany({
      where: { assessmentId: auth.lead.assessmentId },
      orderBy: { updatedAt: 'desc' },
      select: {
        ...caseCommentThreadSelect,
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: caseCommentSelect
        }
      }
    })
    const filtered = threads.filter(thread => canAccessThread(thread, role))
    res.json(filtered)
  } catch (error: any) {
    logger.error('Failed to load comment threads', { error: error.message })
    res.status(500).json({ error: 'Failed to load comment threads' })
  }
})

router.post('/leads/:leadId/comments/threads', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const { title, threadType, allowedRoles } = req.body
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }

    const thread = await prisma.caseCommentThread.create({
      data: {
        assessmentId: auth.lead.assessmentId,
        title,
        threadType: threadType || 'general',
        allowedRoles: allowedRoles ? JSON.stringify(allowedRoles) : null,
        createdById: req.user?.id,
        createdByName: req.user ? `${req.user.firstName} ${req.user.lastName}` : null,
        createdByEmail: req.user?.email || null
      },
      select: caseCommentThreadSelect
    })

    res.json(thread)
  } catch (error: any) {
    logger.error('Failed to create comment thread', { error: error.message })
    res.status(500).json({ error: 'Failed to create comment thread' })
  }
})

router.get('/leads/:leadId/comments/threads/:threadId', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, threadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }

    const thread = await prisma.caseCommentThread.findUnique({
      where: { id: threadId },
      select: {
        ...caseCommentThreadSelect,
        comments: {
          orderBy: { createdAt: 'asc' },
          select: caseCommentSelect
        }
      }
    })

    if (!thread || thread.assessmentId !== auth.lead.assessmentId) {
      return res.status(404).json({ error: 'Thread not found' })
    }

    const role = getUserRole(req.user?.email)
    if (!canAccessThread(thread, role)) {
      return res.status(403).json({ error: 'Not authorized to access this thread' })
    }

    res.json(thread)
  } catch (error: any) {
    logger.error('Failed to load comment thread', { error: error.message })
    res.status(500).json({ error: 'Failed to load comment thread' })
  }
})

router.post('/leads/:leadId/comments/threads/:threadId/comments', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, threadId } = req.params
    const { message } = req.body
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }

    const thread = await prisma.caseCommentThread.findUnique({
      where: { id: threadId },
      select: caseCommentThreadAccessSelect
    })

    if (!thread || thread.assessmentId !== auth.lead.assessmentId) {
      return res.status(404).json({ error: 'Thread not found' })
    }

    const role = getUserRole(req.user?.email)
    if (!canAccessThread(thread, role)) {
      return res.status(403).json({ error: 'Not authorized to access this thread' })
    }

    const mentions = extractMentions(message || '')
    const comment = await prisma.caseComment.create({
      data: {
        threadId,
        message,
        mentions: mentions.length ? JSON.stringify(mentions) : null,
        authorId: req.user?.id,
        authorName: req.user ? `${req.user.firstName} ${req.user.lastName}` : null,
        authorEmail: req.user?.email || null
      },
      select: caseCommentSelect
    })

    const recent = await prisma.caseComment.findMany({
      where: { threadId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { message: true }
    })
    const summary = summarizeComments(recent)
    await prisma.caseCommentThread.update({
      where: { id: threadId },
      data: {
        summary,
        lastCommentAt: new Date()
      }
    })

    res.json(comment)
  } catch (error: any) {
    logger.error('Failed to create comment', { error: error.message })
    res.status(500).json({ error: 'Failed to create comment' })
  }
})

router.post('/leads/:leadId/comments/threads/:threadId/summary', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, threadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }

    const thread = await prisma.caseCommentThread.findUnique({
      where: { id: threadId },
      select: caseCommentThreadAccessSelect
    })

    if (!thread || thread.assessmentId !== auth.lead.assessmentId) {
      return res.status(404).json({ error: 'Thread not found' })
    }

    const role = getUserRole(req.user?.email)
    if (!canAccessThread(thread, role)) {
      return res.status(403).json({ error: 'Not authorized to access this thread' })
    }

    const recent = await prisma.caseComment.findMany({
      where: { threadId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { message: true }
    })
    const summary = summarizeComments(recent)
    const updated = await prisma.caseCommentThread.update({
      where: { id: threadId },
      data: {
        summary,
        lastCommentAt: new Date()
      },
      select: caseCommentThreadSelect
    })

    res.json(updated)
  } catch (error: any) {
    logger.error('Failed to update thread summary', { error: error.message })
    res.status(500).json({ error: 'Failed to update thread summary' })
  }
})

// Billing & payments
router.get('/leads/:leadId/invoices', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth

    const records = await prisma.billingInvoice.findMany({
      where: { assessmentId: lead.assessmentId },
      orderBy: { createdAt: 'desc' },
      select: billingInvoiceSelect
    })
    res.json(records)
  } catch (error: any) {
    logger.error('Failed to load invoices', { error: error.message })
    res.status(500).json({ error: 'Failed to load invoices' })
  }
})

router.post('/leads/:leadId/invoices', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth
    const { invoiceNumber, amount, status, dueDate, paidAt, notes } = req.body

    if (!amount) {
      return res.status(400).json({ error: 'amount is required' })
    }

    const record = await prisma.billingInvoice.create({
      data: {
        assessmentId: lead.assessmentId,
        invoiceNumber: invoiceNumber || null,
        amount: Number(amount),
        status: status || 'open',
        dueDate: dueDate ? new Date(dueDate) : null,
        paidAt: paidAt ? new Date(paidAt) : null,
        notes: notes || null
      },
      select: billingInvoiceSelect
    })
    await createInvoiceReminder(lead.assessmentId, record)
    res.json(record)
  } catch (error: any) {
    logger.error('Failed to create invoice', { error: error.message })
    res.status(500).json({ error: 'Failed to create invoice' })
  }
})

router.patch('/leads/:leadId/invoices/:id', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, id } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { invoiceNumber, amount, status, dueDate, paidAt, notes } = req.body

    const record = await prisma.billingInvoice.update({
      where: { id },
      data: {
        ...(invoiceNumber !== undefined ? { invoiceNumber } : {}),
        ...(amount !== undefined ? { amount: amount ? Number(amount) : 0 } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(paidAt !== undefined ? { paidAt: paidAt ? new Date(paidAt) : null } : {}),
        ...(notes !== undefined ? { notes } : {})
      },
      select: billingInvoiceSelect
    })
    res.json(record)
  } catch (error: any) {
    logger.error('Failed to update invoice', { error: error.message })
    res.status(500).json({ error: 'Failed to update invoice' })
  }
})

router.get('/leads/:leadId/invoices/:id/docx', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, id } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth

    const invoice = await prisma.billingInvoice.findUnique({
      where: { id },
      select: billingInvoiceSelect
    })
    if (!invoice || invoice.assessmentId !== lead.assessmentId) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Invoice', bold: true, size: 28 })]
            }),
            new Paragraph(`Invoice #: ${invoice.invoiceNumber || 'N/A'}`),
            new Paragraph(`Amount: $${invoice.amount}`),
            new Paragraph(`Status: ${invoice.status}`),
            new Paragraph(`Due Date: ${invoice.dueDate ? invoice.dueDate.toDateString() : 'N/A'}`),
            new Paragraph(`Notes: ${invoice.notes || ''}`)
          ]
        }
      ]
    })

    const buffer = await Packer.toBuffer(doc)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.id}.docx`)
    res.send(buffer)
  } catch (error: any) {
    logger.error('Failed to download invoice docx', { error: error.message })
    res.status(500).json({ error: 'Failed to download invoice docx' })
  }
})

router.get('/leads/:leadId/invoices/:id/pdf', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, id } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth

    const invoice = await prisma.billingInvoice.findUnique({
      where: { id },
      select: billingInvoiceSelect
    })
    if (!invoice || invoice.assessmentId !== lead.assessmentId) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    const doc = new PDFDocument({ margin: 50 })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.id}.pdf`)
    doc.pipe(res)

    doc.fontSize(20).text('Invoice', { underline: true })
    doc.moveDown()
    doc.fontSize(12).text(`Invoice #: ${invoice.invoiceNumber || 'N/A'}`)
    doc.text(`Amount: $${invoice.amount}`)
    doc.text(`Status: ${invoice.status}`)
    doc.text(`Due Date: ${invoice.dueDate ? invoice.dueDate.toDateString() : 'N/A'}`)
    if (invoice.notes) {
      doc.moveDown()
      doc.text(`Notes: ${invoice.notes}`)
    }
    doc.end()
  } catch (error: any) {
    logger.error('Failed to download invoice pdf', { error: error.message })
    res.status(500).json({ error: 'Failed to download invoice pdf' })
  }
})

router.delete('/leads/:leadId/invoices/:id', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, id } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    await prisma.billingInvoice.delete({ where: { id } })
    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Failed to delete invoice', { error: error.message })
    res.status(500).json({ error: 'Failed to delete invoice' })
  }
})

router.get('/leads/:leadId/payments', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth

    const records = await prisma.billingPayment.findMany({
      where: { assessmentId: lead.assessmentId },
      orderBy: { receivedAt: 'desc' },
      select: billingPaymentSelect
    })
    res.json(records)
  } catch (error: any) {
    logger.error('Failed to load payments', { error: error.message })
    res.status(500).json({ error: 'Failed to load payments' })
  }
})

router.post('/leads/:leadId/payments', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth
    const { amount, method, receivedAt, reference, notes } = req.body

    if (!amount) {
      return res.status(400).json({ error: 'amount is required' })
    }

    const record = await prisma.billingPayment.create({
      data: {
        assessmentId: lead.assessmentId,
        amount: Number(amount),
        method: method || null,
        receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
        reference: reference || null,
        notes: notes || null
      },
      select: billingPaymentSelect
    })
    res.json(record)
  } catch (error: any) {
    logger.error('Failed to create payment', { error: error.message })
    res.status(500).json({ error: 'Failed to create payment' })
  }
})

router.get('/leads/:leadId/payments/:id/receipt/pdf', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, id } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth

    const payment = await prisma.billingPayment.findUnique({
      where: { id },
      select: billingPaymentSelect
    })
    if (!payment || payment.assessmentId !== lead.assessmentId) {
      return res.status(404).json({ error: 'Payment not found' })
    }

    const doc = new PDFDocument({ margin: 50 })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${payment.id}.pdf`)
    doc.pipe(res)

    doc.fontSize(20).text('Payment Receipt', { underline: true })
    doc.moveDown()
    doc.fontSize(12).text(`Payment ID: ${payment.id}`)
    doc.text(`Amount: $${payment.amount}`)
    doc.text(`Method: ${payment.method || 'N/A'}`)
    doc.text(`Received At: ${payment.receivedAt.toDateString()}`)
    if (payment.reference) doc.text(`Reference: ${payment.reference}`)
    if (payment.notes) {
      doc.moveDown()
      doc.text(`Notes: ${payment.notes}`)
    }
    doc.end()
  } catch (error: any) {
    logger.error('Failed to download payment receipt', { error: error.message })
    res.status(500).json({ error: 'Failed to download payment receipt' })
  }
})

router.delete('/leads/:leadId/payments/:id', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, id } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    await prisma.billingPayment.delete({ where: { id } })
    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Failed to delete payment', { error: error.message })
    res.status(500).json({ error: 'Failed to delete payment' })
  }
})

// Case health score
router.get('/leads/:leadId/health', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead, attorney } = auth

    const computed = await computeCaseHealth(leadId, lead.assessmentId, attorney.id)
    const latestSnapshot = await prisma.caseHealthSnapshot.findFirst({
      where: { assessmentId: lead.assessmentId },
      orderBy: { createdAt: 'desc' }
    })
    const snapshots = await prisma.caseHealthSnapshot.findMany({
      where: { assessmentId: lead.assessmentId },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
    res.json({ ...computed, latestSnapshot, snapshots })
  } catch (error: any) {
    logger.error('Failed to load case health score', { error: error.message })
    res.status(500).json({ error: 'Failed to load case health score' })
  }
})

router.post('/leads/:leadId/health', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead, attorney } = auth

    const computed = await computeCaseHealth(leadId, lead.assessmentId, attorney.id)
    const snapshot = await prisma.caseHealthSnapshot.create({
      data: {
        assessmentId: lead.assessmentId,
        score: computed.score,
        level: computed.level,
        factors: JSON.stringify({
          factors: computed.factors,
          alerts: computed.alerts,
          components: computed.components
        })
      }
    })
    if (computed.alerts?.length) {
      await scheduleHealthAlerts(lead.assessmentId, computed.alerts)
    }
    res.json({ ...computed, snapshot })
  } catch (error: any) {
    logger.error('Failed to save case health score', { error: error.message })
    res.status(500).json({ error: 'Failed to save case health score' })
  }
})

// Reminder templates
router.get('/templates/reminders', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const attorney = await prisma.attorney.findFirst({ where: { email: req.user.email } })
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }
    const templates = await prisma.reminderTemplate.findMany({
      where: { attorneyId: attorney.id },
      orderBy: { createdAt: 'desc' }
    })
    res.json(templates)
  } catch (error: any) {
    logger.error('Failed to load reminder templates', { error: error.message })
    res.status(500).json({ error: 'Failed to load reminder templates' })
  }
})

router.post('/templates/reminders', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const attorney = await prisma.attorney.findFirst({ where: { email: req.user.email } })
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }
    const { name, channel, offsetDays, message } = req.body
    if (!name || !message) {
      return res.status(400).json({ error: 'name and message are required' })
    }
    const template = await prisma.reminderTemplate.create({
      data: {
        attorneyId: attorney.id,
        name,
        channel: channel || 'email',
        offsetDays: offsetDays ? Number(offsetDays) : 3,
        message
      }
    })
    res.json(template)
  } catch (error: any) {
    logger.error('Failed to create reminder template', { error: error.message })
    res.status(500).json({ error: 'Failed to create reminder template' })
  }
})

router.patch('/templates/reminders/:id', authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const attorney = await prisma.attorney.findFirst({ where: { email: req.user.email } })
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }
    const { name, channel, offsetDays, message } = req.body
    const template = await prisma.reminderTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(channel !== undefined ? { channel } : {}),
        ...(offsetDays !== undefined ? { offsetDays: Number(offsetDays) } : {}),
        ...(message !== undefined ? { message } : {})
      }
    })
    res.json(template)
  } catch (error: any) {
    logger.error('Failed to update reminder template', { error: error.message })
    res.status(500).json({ error: 'Failed to update reminder template' })
  }
})

router.delete('/templates/reminders/:id', authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const attorney = await prisma.attorney.findFirst({ where: { email: req.user.email } })
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }
    await prisma.reminderTemplate.delete({ where: { id } })
    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Failed to delete reminder template', { error: error.message })
    res.status(500).json({ error: 'Failed to delete reminder template' })
  }
})

// Case reminders
router.get('/leads/:leadId/reminders', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth

    const reminders = await prisma.caseReminder.findMany({
      where: { assessmentId: lead.assessmentId },
      orderBy: { dueAt: 'asc' }
    })
    res.json(reminders)
  } catch (error: any) {
    logger.error('Failed to load case reminders', { error: error.message })
    res.status(500).json({ error: 'Failed to load case reminders' })
  }
})

router.post('/leads/:leadId/reminders', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth
    const { templateId, channel, message, dueAt, offsetDays } = req.body

    let reminderMessage = message
    let reminderChannel = channel
    let reminderDueAt = dueAt ? new Date(dueAt) : null

    if (templateId) {
      const template = await prisma.reminderTemplate.findUnique({ where: { id: templateId } })
      if (template) {
        reminderMessage = reminderMessage || template.message
        reminderChannel = reminderChannel || template.channel
        if (!reminderDueAt) {
          const next = new Date()
          next.setDate(next.getDate() + (offsetDays ? Number(offsetDays) : template.offsetDays))
          reminderDueAt = next
        }
      }
    }

    if (!reminderMessage || !reminderChannel || !reminderDueAt) {
      return res.status(400).json({ error: 'message, channel, and dueAt are required' })
    }

    const reminder = await prisma.caseReminder.create({
      data: {
        assessmentId: lead.assessmentId,
        templateId: templateId || null,
        channel: reminderChannel,
        message: reminderMessage,
        dueAt: reminderDueAt,
        status: 'scheduled'
      }
    })
    res.json(reminder)
  } catch (error: any) {
    logger.error('Failed to create case reminder', { error: error.message })
    res.status(500).json({ error: 'Failed to create case reminder' })
  }
})

router.patch('/leads/:leadId/reminders/:id', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, id } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const existingReminder = await prisma.caseReminder.findUnique({ where: { id } })
    if (!existingReminder) {
      return res.status(404).json({ error: 'Reminder not found' })
    }
    const { channel, message, dueAt, status } = req.body
    const reminder = await prisma.caseReminder.update({
      where: { id },
      data: {
        ...(channel !== undefined ? { channel } : {}),
        ...(message !== undefined ? { message } : {}),
        ...(dueAt !== undefined ? { dueAt: new Date(dueAt) } : {}),
        ...(status !== undefined ? { status } : {})
      }
    })
    if (isReadinessAutomationMessage(existingReminder.message || reminder.message)) {
      const nextStatus = typeof status === 'string' ? status : reminder.status
      const action =
        nextStatus === 'dismissed'
          ? 'automation_feed_dismissed'
          : dueAt !== undefined
            ? 'automation_feed_snoozed'
            : 'automation_feed_updated'
      await writeAutomationAudit({
        userId: req.user?.id || null,
        attorneyId: auth.attorney.id,
        action,
        entityType: 'automation_feed',
        entityId: reminder.id,
        metadata: {
          leadId,
          assessmentId: reminder.assessmentId,
          previousDueAt: existingReminder.dueAt,
          nextDueAt: reminder.dueAt,
          previousStatus: existingReminder.status,
          nextStatus,
        },
      })
    }
    res.json(reminder)
  } catch (error: any) {
    logger.error('Failed to update case reminder', { error: error.message })
    res.status(500).json({ error: 'Failed to update case reminder' })
  }
})

router.delete('/leads/:leadId/reminders/:id', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, id } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    await prisma.caseReminder.delete({ where: { id } })
    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Failed to delete case reminder', { error: error.message })
    res.status(500).json({ error: 'Failed to delete case reminder' })
  }
})

router.post('/leads/:leadId/reminders/process', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth
    const now = new Date()

    const dueReminders = await prisma.caseReminder.findMany({
      where: {
        assessmentId: lead.assessmentId,
        status: 'scheduled',
        dueAt: { lte: now }
      },
      orderBy: { dueAt: 'asc' }
    })

    const updated: any[] = []
    for (const reminder of dueReminders) {
      const record = await prisma.caseReminder.update({
        where: { id: reminder.id },
        data: {
          status: 'sent',
          deliveryStatus: 'delivered',
          attempts: reminder.attempts + 1,
          sentAt: now,
          lastAttemptAt: now
        }
      })
      if (isReadinessAutomationMessage(record.message)) {
        await writeAutomationAudit({
          userId: req.user?.id || null,
          attorneyId: auth.attorney.id,
          action: 'automation_feed_sent',
          entityType: 'automation_feed',
          entityId: record.id,
          metadata: {
            leadId,
            assessmentId: record.assessmentId,
            sentAt: now,
          },
        })
      }
      updated.push(record)
    }

    res.json({ processed: updated.length, reminders: updated })
  } catch (error: any) {
    logger.error('Failed to process reminders', { error: error.message })
    res.status(500).json({ error: 'Failed to process reminders' })
  }
})

// Health escalation rules
router.get('/health-rules', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const attorney = await prisma.attorney.findFirst({ where: { email: req.user.email } })
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }
    const rules = await prisma.healthEscalationRule.findMany({
      where: { attorneyId: attorney.id },
      orderBy: { threshold: 'asc' }
    })
    res.json(rules)
  } catch (error: any) {
    logger.error('Failed to load health rules', { error: error.message })
    res.status(500).json({ error: 'Failed to load health rules' })
  }
})

router.post('/health-rules', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const attorney = await prisma.attorney.findFirst({ where: { email: req.user.email } })
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }
    const { threshold, action } = req.body
    if (threshold === undefined || !action) {
      return res.status(400).json({ error: 'threshold and action are required' })
    }
    const rule = await prisma.healthEscalationRule.create({
      data: {
        attorneyId: attorney.id,
        threshold: Number(threshold),
        action
      }
    })
    res.json(rule)
  } catch (error: any) {
    logger.error('Failed to create health rule', { error: error.message })
    res.status(500).json({ error: 'Failed to create health rule' })
  }
})

router.delete('/health-rules/:id', authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const attorney = await prisma.attorney.findFirst({ where: { email: req.user.email } })
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }
    await prisma.healthEscalationRule.delete({ where: { id } })
    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Failed to delete health rule', { error: error.message })
    res.status(500).json({ error: 'Failed to delete health rule' })
  }
})

// Negotiation cadence templates
router.get('/templates/negotiation-cadence', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const attorney = await prisma.attorney.findFirst({ where: { email: req.user.email } })
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }
    const templates = await prisma.negotiationCadenceTemplate.findMany({
      where: { attorneyId: attorney.id },
      include: { steps: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json(templates)
  } catch (error: any) {
    logger.error('Failed to load negotiation cadence templates', { error: error.message })
    res.status(500).json({ error: 'Failed to load negotiation cadence templates' })
  }
})

router.post('/templates/negotiation-cadence', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const attorney = await prisma.attorney.findFirst({ where: { email: req.user.email } })
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }
    const { name, triggerEventType, steps } = req.body
    if (!name || !triggerEventType || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: 'name, triggerEventType, and steps are required' })
    }

    const template = await prisma.negotiationCadenceTemplate.create({
      data: {
        attorneyId: attorney.id,
        name,
        triggerEventType,
        steps: {
          create: steps.map((step: any, index: number) => ({
            offsetDays: Number(step.offsetDays) || 0,
            channel: step.channel || 'email',
            message: step.message || '',
            sortOrder: step.sortOrder ?? index
          }))
        }
      },
      include: { steps: true }
    })
    res.json(template)
  } catch (error: any) {
    logger.error('Failed to create negotiation cadence template', { error: error.message })
    res.status(500).json({ error: 'Failed to create negotiation cadence template' })
  }
})

router.delete('/templates/negotiation-cadence/:id', authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const attorney = await prisma.attorney.findFirst({ where: { email: req.user.email } })
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }
    await prisma.negotiationCadenceTemplate.delete({ where: { id } })
    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Failed to delete negotiation cadence template', { error: error.message })
    res.status(500).json({ error: 'Failed to delete negotiation cadence template' })
  }
})

// Task SLA templates
router.get('/templates/task-sla', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const attorney = await prisma.attorney.findFirst({ where: { email: req.user.email } })
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }
    const templates = await prisma.taskSlaTemplate.findMany({
      where: { attorneyId: attorney.id },
      include: { steps: { orderBy: { offsetDays: 'asc' } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json(templates)
  } catch (error: any) {
    logger.error('Failed to load task SLA templates', { error: error.message })
    res.status(500).json({ error: 'Failed to load task SLA templates' })
  }
})

router.post('/templates/task-sla', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const attorney = await prisma.attorney.findFirst({ where: { email: req.user.email } })
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }
    const { name, triggerStatus, steps } = req.body
    if (!name || !triggerStatus || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: 'name, triggerStatus, and steps are required' })
    }
    const template = await prisma.taskSlaTemplate.create({
      data: {
        attorneyId: attorney.id,
        name,
        triggerStatus,
        steps: {
          create: steps.map((step: any) => ({
            title: step.title || 'Follow up',
            offsetDays: Number(step.offsetDays) || 0,
            priority: step.priority || 'medium'
          }))
        }
      },
      include: { steps: true }
    })
    res.json(template)
  } catch (error: any) {
    logger.error('Failed to create task SLA template', { error: error.message })
    res.status(500).json({ error: 'Failed to create task SLA template' })
  }
})

router.delete('/templates/task-sla/:id', authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const attorney = await prisma.attorney.findFirst({ where: { email: req.user.email } })
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }
    await prisma.taskSlaTemplate.delete({ where: { id } })
    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Failed to delete task SLA template', { error: error.message })
    res.status(500).json({ error: 'Failed to delete task SLA template' })
  }
})

// Workflow templates by case type
router.get('/templates/workflows', authMiddleware, async (req: any, res) => {
  try {
    const attorney = await prisma.attorney.findFirst({
      where: { email: req.user.email }
    })
    if (!attorney) {
      return res.status(404).json({ error: 'Attorney not found' })
    }
    const templates = await prisma.caseWorkflowTemplate.findMany({
      where: { attorneyId: attorney.id },
      include: { steps: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(templates)
  } catch (error: any) {
    logger.error('Failed to load workflow templates', { error: error.message })
    res.status(500).json({ error: 'Failed to load workflow templates' })
  }
})

router.post('/templates/workflows', authMiddleware, async (req: any, res) => {
  try {
    const attorney = await prisma.attorney.findFirst({
      where: { email: req.user.email }
    })
    if (!attorney) {
      return res.status(404).json({ error: 'Attorney not found' })
    }
    const { name, caseType, description, steps } = req.body
    if (!name || !caseType || !Array.isArray(steps)) {
      return res.status(400).json({ error: 'name, caseType, and steps are required' })
    }

    const template = await prisma.caseWorkflowTemplate.create({
      data: {
        attorneyId: attorney.id,
        name,
        caseType,
        description: description || null,
        steps: {
          create: steps.map((step: any, idx: number) => ({
            title: step.title,
            offsetDays: Number(step.offsetDays || 0),
            priority: step.priority || 'medium',
            taskType: step.taskType || 'general',
            milestoneType: step.milestoneType || null,
            checkpointType: step.checkpointType || null,
            deadlineType: step.deadlineType || null,
            assignedRole: step.assignedRole || null,
            reminderOffsetDays: Number(step.reminderOffsetDays || 1),
            escalationLevel: step.escalationLevel || 'none'
          }))
        }
      },
      include: { steps: true }
    })
    res.json(template)
  } catch (error: any) {
    logger.error('Failed to create workflow template', { error: error.message })
    res.status(500).json({ error: 'Failed to create workflow template' })
  }
})

router.delete('/templates/workflows/:id', authMiddleware, async (req: any, res) => {
  try {
    const { id } = req.params
    await prisma.caseWorkflowTemplate.delete({ where: { id } })
    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Failed to delete workflow template', { error: error.message })
    res.status(500).json({ error: 'Failed to delete workflow template' })
  }
})

router.post('/leads/:leadId/workflows/:templateId/apply', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, templateId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth
    const { baseDate } = req.body
    const base = baseDate ? new Date(baseDate) : new Date()

    const template = await prisma.caseWorkflowTemplate.findUnique({
      where: { id: templateId },
      include: { steps: true }
    })
    if (!template) {
      return res.status(404).json({ error: 'Template not found' })
    }

    const created = []
    for (const step of template.steps) {
      const dueDate = addDays(base, step.offsetDays)
      const reminderAt = addDays(dueDate, -Number(step.reminderOffsetDays || 1))
      const task = await prisma.caseTask.create({
        data: {
          assessmentId: lead.assessmentId,
          title: step.title,
          dueDate,
          reminderAt,
          priority: step.priority || 'medium',
          status: 'open',
          taskType: step.taskType || 'general',
          milestoneType: step.milestoneType || null,
          checkpointType: step.checkpointType || null,
          deadlineType: step.deadlineType || null,
          assignedRole: step.assignedRole || null,
          escalationLevel: step.escalationLevel || 'none',
          sourceTemplateId: template.id,
          sourceTemplateStepId: step.id
        }
      })
      await scheduleTaskReminder(lead.assessmentId, {
        title: task.title,
        dueDate: task.dueDate,
        reminderAt: task.reminderAt
      })
      created.push(task)
    }
    res.json({ createdCount: created.length, tasks: created })
  } catch (error: any) {
    logger.error('Failed to apply workflow template', { error: error.message })
    res.status(500).json({ error: 'Failed to apply workflow template' })
  }
})

// Recurring invoices
router.get('/leads/:leadId/recurring-invoices', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth
    const records = await prisma.recurringInvoice.findMany({
      where: { assessmentId: lead.assessmentId },
      orderBy: { createdAt: 'desc' }
    })
    res.json(records)
  } catch (error: any) {
    logger.error('Failed to load recurring invoices', { error: error.message })
    res.status(500).json({ error: 'Failed to load recurring invoices' })
  }
})

router.post('/leads/:leadId/recurring-invoices', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth
    const { amount, intervalDays, nextRunAt, notes } = req.body
    if (!amount) {
      return res.status(400).json({ error: 'amount is required' })
    }
    const record = await prisma.recurringInvoice.create({
      data: {
        assessmentId: lead.assessmentId,
        amount: Number(amount),
        intervalDays: intervalDays ? Number(intervalDays) : 30,
        nextRunAt: nextRunAt ? new Date(nextRunAt) : addDays(new Date(), 30),
        notes: notes || null
      }
    })
    res.json(record)
  } catch (error: any) {
    logger.error('Failed to create recurring invoice', { error: error.message })
    res.status(500).json({ error: 'Failed to create recurring invoice' })
  }
})

router.patch('/leads/:leadId/recurring-invoices/:id', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, id } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { amount, intervalDays, nextRunAt, status, notes } = req.body
    const record = await prisma.recurringInvoice.update({
      where: { id },
      data: {
        ...(amount !== undefined ? { amount: Number(amount) } : {}),
        ...(intervalDays !== undefined ? { intervalDays: Number(intervalDays) } : {}),
        ...(nextRunAt !== undefined ? { nextRunAt: new Date(nextRunAt) } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(notes !== undefined ? { notes } : {})
      }
    })
    res.json(record)
  } catch (error: any) {
    logger.error('Failed to update recurring invoice', { error: error.message })
    res.status(500).json({ error: 'Failed to update recurring invoice' })
  }
})

router.delete('/leads/:leadId/recurring-invoices/:id', authMiddleware, async (req: any, res) => {
  try {
    const { leadId, id } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    await prisma.recurringInvoice.delete({ where: { id } })
    res.json({ ok: true })
  } catch (error: any) {
    logger.error('Failed to delete recurring invoice', { error: error.message })
    res.status(500).json({ error: 'Failed to delete recurring invoice' })
  }
})

router.post('/leads/:leadId/recurring-invoices/process', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth
    const now = new Date()
    const records = await prisma.recurringInvoice.findMany({
      where: {
        assessmentId: lead.assessmentId,
        status: 'active',
        nextRunAt: { lte: now }
      }
    })

    const created: any[] = []
    for (const recurring of records) {
      const invoice = await prisma.billingInvoice.create({
        data: {
          assessmentId: lead.assessmentId,
          amount: recurring.amount,
          status: 'open',
          dueDate: addDays(now, recurring.intervalDays)
        }
      })
      await createInvoiceReminder(lead.assessmentId, invoice)
      await prisma.recurringInvoice.update({
        where: { id: recurring.id },
        data: {
          lastRunAt: now,
          nextRunAt: addDays(now, recurring.intervalDays)
        }
      })
      created.push(invoice)
    }

    res.json({ created: created.length, invoices: created })
  } catch (error: any) {
    logger.error('Failed to process recurring invoices', { error: error.message })
    res.status(500).json({ error: 'Failed to process recurring invoices' })
  }
})

// Decision intelligence & memory
router.get('/leads/:leadId/decision-intelligence', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead, attorney } = auth

    const [evidenceCount, profile] = await Promise.all([
      prisma.evidenceFile.count({
        where: { assessmentId: lead.assessmentId }
      }),
      prisma.attorneyDecisionProfile.findUnique({
        where: { attorneyId: attorney.id },
        select: attorneyDecisionProfileSelect
      })
    ])
    const recommendation = buildDecisionRecommendation(lead, evidenceCount, profile || undefined)

    const [memory, firmHistory, attorneyHistory] = await Promise.all([
      prisma.decisionMemory.upsert({
        where: { leadId },
        create: {
          leadId,
          assessmentId: lead.assessmentId,
          attorneyId: attorney.id,
          lawFirmId: attorney.lawFirmId || null,
          ...recommendation
        },
        update: {
          ...recommendation
        },
        select: decisionMemorySelect
      }),
      attorney.lawFirmId
        ? prisma.decisionMemory.findMany({
            where: { lawFirmId: attorney.lawFirmId, outcomeStatus: { not: null } },
            orderBy: { outcomeAt: 'desc' },
            take: 50,
            select: {
              attorneyDecision: true,
              outcomeStatus: true,
              attorneyRationale: true
            }
          })
        : Promise.resolve([]),
      prisma.decisionMemory.findMany({
        where: { attorneyId: attorney.id, outcomeStatus: { not: null } },
        orderBy: { outcomeAt: 'desc' },
        take: 50,
        select: {
          attorneyDecision: true,
          outcomeStatus: true
        }
      })
    ])

    const firmPatterns = firmHistory.length ? buildFirmPatterns(firmHistory) : null
    const recentWin = firmHistory.find(item => item.outcomeStatus && ['retained', 'settled', 'won'].includes(item.outcomeStatus))
    const lastWorked = recentWin
      ? {
          outcomeStatus: recentWin.outcomeStatus,
          attorneyDecision: recentWin.attorneyDecision,
          rationale: recentWin.attorneyRationale
        }
      : null
    const attorneyPatterns = buildAttorneyPatterns(attorneyHistory)

    res.json({
      recommendation,
      attorneyProfile: profile,
      attorneyPatterns,
      memory,
      firmPatterns,
      lastWorked
    })
  } catch (error: any) {
    logger.error('Failed to load decision intelligence', { error: error.message })
    res.status(500).json({ error: 'Failed to load decision intelligence' })
  }
})

router.get('/attorney/decision-profile', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const attorney = await prisma.attorney.findFirst({
      where: { email: req.user.email },
      select: attorneyIdentitySelect
    })

    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }

    const profile = await prisma.attorneyDecisionProfile.findUnique({
      where: { attorneyId: attorney.id },
      select: attorneyDecisionProfileSelect
    })

    res.json(profile)
  } catch (error: any) {
    logger.error('Failed to load attorney decision profile', { error: error.message })
    res.status(500).json({ error: 'Failed to load attorney decision profile' })
  }
})

router.post('/attorney/decision-profile', authMiddleware, async (req: any, res) => {
  try {
    const { negotiationStyle, riskTolerance, preferences } = req.body

    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const attorney = await prisma.attorney.findFirst({
      where: { email: req.user.email },
      select: attorneyIdentitySelect
    })

    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }

    const profile = await prisma.attorneyDecisionProfile.upsert({
      where: { attorneyId: attorney.id },
      create: {
        attorneyId: attorney.id,
        lawFirmId: attorney.lawFirmId || null,
        negotiationStyle: negotiationStyle || null,
        riskTolerance: riskTolerance || null,
        preferences: preferences ? JSON.stringify(preferences) : null
      },
      update: {
        negotiationStyle: negotiationStyle || null,
        riskTolerance: riskTolerance || null,
        preferences: preferences ? JSON.stringify(preferences) : null,
        lawFirmId: attorney.lawFirmId || null
      },
      select: attorneyDecisionProfileSelect
    })

    res.json(profile)
  } catch (error: any) {
    logger.error('Failed to save attorney decision profile', { error: error.message })
    res.status(500).json({ error: 'Failed to save attorney decision profile' })
  }
})

router.get('/attorney/decision-benchmark', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const attorney = await prisma.attorney.findFirst({
      where: { email: req.user.email },
      select: attorneyIdentitySelect
    })

    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }

    const [attorneyHistory, firmHistory] = await Promise.all([
      prisma.decisionMemory.findMany({
        where: { attorneyId: attorney.id, outcomeStatus: { not: null } },
        orderBy: { outcomeAt: 'desc' },
        take: 100,
        select: attorneyDecisionBenchmarkHistorySelect
      }),
      attorney.lawFirmId
        ? prisma.decisionMemory.findMany({
            where: { lawFirmId: attorney.lawFirmId, outcomeStatus: { not: null } },
            orderBy: { outcomeAt: 'desc' },
            take: 200,
            select: firmDecisionBenchmarkHistorySelect
          })
        : Promise.resolve([])
    ])

    res.json({
      attorney: buildAttorneyPatterns(attorneyHistory),
      firm: firmHistory.length ? buildFirmPatterns(firmHistory) : null
    })
  } catch (error: any) {
    logger.error('Failed to load decision benchmarks', { error: error.message })
    res.status(500).json({ error: 'Failed to load decision benchmarks' })
  }
})

router.get('/attorney/decision-summary', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const attorney = await prisma.attorney.findFirst({
      where: { email: req.user.email },
      select: attorneyIdentitySelect
    })

    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }

    const [attorneyHistory, firmHistory] = await Promise.all([
      prisma.decisionMemory.findMany({
        where: { attorneyId: attorney.id },
        orderBy: { decisionAt: 'desc' },
        take: 200,
        select: decisionSummaryHistorySelect
      }),
      attorney.lawFirmId
        ? prisma.decisionMemory.findMany({
            where: { lawFirmId: attorney.lawFirmId },
            orderBy: { decisionAt: 'desc' },
            take: 300,
            select: decisionSummaryHistorySelect
          })
        : Promise.resolve([])
    ])

    res.json({
      attorney: buildDecisionSummary(attorneyHistory),
      firm: firmHistory.length ? buildDecisionSummary(firmHistory) : null
    })
  } catch (error: any) {
    logger.error('Failed to load decision summary', { error: error.message })
    res.status(500).json({ error: 'Failed to load decision summary' })
  }
})

router.post('/leads/:leadId/decision-intelligence/override', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const { decision, rationale } = req.body
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead, attorney } = auth

    const [evidenceCount, profile] = await Promise.all([
      prisma.evidenceFile.count({
        where: { assessmentId: lead.assessmentId }
      }),
      prisma.attorneyDecisionProfile.findUnique({
        where: { attorneyId: attorney.id },
        select: attorneyDecisionProfileSelect
      })
    ])
    const recommendation = buildDecisionRecommendation(lead, evidenceCount, profile || undefined)
    const override = decision ? decision !== recommendation.recommendedDecision : false

    const memory = await prisma.decisionMemory.upsert({
      where: { leadId },
      create: {
        leadId,
        assessmentId: lead.assessmentId,
        attorneyId: attorney.id,
        lawFirmId: attorney.lawFirmId || null,
        ...recommendation,
        attorneyDecision: decision,
        attorneyRationale: rationale || null,
        override,
        decisionAt: decision ? new Date() : null
      },
      update: {
        ...recommendation,
        attorneyDecision: decision,
        attorneyRationale: rationale || null,
        override,
        decisionAt: decision ? new Date() : null
      },
      select: decisionMemorySelect
    })

    res.json(memory)
  } catch (error: any) {
    logger.error('Failed to save decision override', { error: error.message })
    res.status(500).json({ error: 'Failed to save decision override' })
  }
})

router.patch('/leads/:leadId/decision-intelligence/outcome', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const {
      outcomeStatus,
      outcomeNotes,
      retained,
      settlementAmount,
      wentToTrial,
      attorneySatisfaction,
      attorneySatisfactionNotes,
    } = req.body
    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead, attorney } = auth

    const normalizedOutcome = String(outcomeStatus || '').toLowerCase()

    // Coerce/validate optional resolution + satisfaction inputs.
    const parsedSettlement =
      settlementAmount === undefined || settlementAmount === null || settlementAmount === ''
        ? undefined
        : Number(settlementAmount)
    if (parsedSettlement !== undefined && (!Number.isFinite(parsedSettlement) || parsedSettlement < 0)) {
      return res.status(400).json({ error: 'settlementAmount must be a non-negative number' })
    }
    const parsedAttorneySatisfaction =
      attorneySatisfaction === undefined || attorneySatisfaction === null || attorneySatisfaction === ''
        ? undefined
        : Number(attorneySatisfaction)
    if (
      parsedAttorneySatisfaction !== undefined &&
      (!Number.isInteger(parsedAttorneySatisfaction) || parsedAttorneySatisfaction < 1 || parsedAttorneySatisfaction > 5)
    ) {
      return res.status(400).json({ error: 'attorneySatisfaction must be an integer from 1 to 5' })
    }

    // Derive retained/trial from the outcome status when not explicitly provided.
    const resolvedRetained =
      typeof retained === 'boolean'
        ? retained
        : ['retained', 'settled', 'won'].includes(normalizedOutcome)
          ? true
          : undefined
    const resolvedWentToTrial =
      typeof wentToTrial === 'boolean'
        ? wentToTrial
        : normalizedOutcome === 'won' || normalizedOutcome === 'verdict'
          ? true
          : undefined

    const outcomeFields = {
      outcomeStatus: outcomeStatus || null,
      outcomeNotes: outcomeNotes || null,
      outcomeAt: outcomeStatus ? new Date() : null,
      ...(resolvedRetained !== undefined ? { retained: resolvedRetained } : {}),
      ...(parsedSettlement !== undefined ? { settlementAmount: parsedSettlement } : {}),
      ...(resolvedWentToTrial !== undefined ? { wentToTrial: resolvedWentToTrial } : {}),
      ...(parsedAttorneySatisfaction !== undefined ? { attorneySatisfaction: parsedAttorneySatisfaction } : {}),
      ...(attorneySatisfactionNotes !== undefined ? { attorneySatisfactionNotes: attorneySatisfactionNotes || null } : {}),
    }

    const memory = await prisma.decisionMemory.upsert({
      where: { leadId },
      create: {
        leadId,
        assessmentId: lead.assessmentId,
        attorneyId: attorney.id,
        lawFirmId: attorney.lawFirmId || null,
        recommendedDecision: 'accept',
        recommendedConfidence: 50,
        ...outcomeFields,
      },
      update: outcomeFields,
      select: decisionMemorySelect
    })

    // When a monetary resolution is reported, mirror it into CaseOutcome so the
    // valuation-calibration dataset learns from the real settlement/verdict.
    if (parsedSettlement !== undefined && parsedSettlement > 0) {
      try {
        await recordCaseOutcome({
          assessmentId: lead.assessmentId,
          outcomeType: resolvedWentToTrial ? 'verdict' : 'settlement',
          grossAmount: parsedSettlement,
          resolvedAt: new Date(),
          source: 'attorney_reported',
          notes: outcomeNotes || null,
        })
      } catch (err: any) {
        logger.warn('Failed to record CaseOutcome from attorney outcome report', {
          error: err?.message,
          leadId,
        })
      }
    }

    if (normalizedOutcome) {
      const leadUpdate: Record<string, unknown> = {}
      if (normalizedOutcome === 'retained' || normalizedOutcome === 'settled' || normalizedOutcome === 'won') {
        leadUpdate.status = 'retained'
        leadUpdate.assignedAttorneyId = lead.assignedAttorneyId || attorney.id
        leadUpdate.convertedAt = new Date()
        leadUpdate.lifecycleState = 'engaged'
        leadUpdate.routingLocked = true
      } else if (normalizedOutcome === 'consulted') {
        leadUpdate.status = 'consulted'
        leadUpdate.lifecycleState = 'consultation_scheduled'
      } else if (normalizedOutcome === 'lost' || normalizedOutcome === 'rejected') {
        leadUpdate.status = 'rejected'
        leadUpdate.lifecycleState = 'closed'
        leadUpdate.routingLocked = false
      }

      if (Object.keys(leadUpdate).length > 0) {
        await prisma.leadSubmission.update({
          where: { id: leadId },
          data: leadUpdate
        })
      }

      const intro = await prisma.introduction.findFirst({
        where: {
          assessmentId: lead.assessmentId,
          attorneyId: attorney.id
        },
        select: { id: true }
      })

      await recordRoutingEvent(lead.assessmentId, intro?.id ?? null, attorney.id, 'feedback_recorded', {
        leadId,
        outcomeStatus: normalizedOutcome
      })

      if (normalizedOutcome === 'retained' || normalizedOutcome === 'settled' || normalizedOutcome === 'won') {
        const revenueProjection = await buildRevenueProjection(lead.assessmentId)
        await recordRoutingEvent(lead.assessmentId, intro?.id ?? null, attorney.id, 'revenue_realized', {
          leadId,
          outcomeStatus: normalizedOutcome,
          ...(revenueProjection || {})
        })
      }

      await calculateAttorneyReputationScore(attorney.id).catch((err: any) => {
        logger.warn('Failed to recalculate attorney reputation after outcome update', { error: err?.message, attorneyId: attorney.id })
      })
    }

    res.json(memory)
  } catch (error: any) {
    logger.error('Failed to update decision outcome', { error: error.message })
    res.status(500).json({ error: 'Failed to update decision outcome' })
  }
})

router.get('/leads/:leadId/command-center', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAuthorizedLead(req, req.params.leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }

    const summary = await buildCaseCommandCenter({
      assessmentId: auth.lead.assessmentId,
      leadId: auth.lead.id,
    })

    res.json(summary)
  } catch (error: any) {
    logger.error('Failed to load lead command center', { error: error.message, leadId: req.params.leadId })
    res.status(500).json({ error: 'Failed to load lead command center' })
  }
})

router.post('/leads/:leadId/command-center/copilot', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAuthorizedLead(req, req.params.leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }

    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : ''
    if (!question) {
      return res.status(400).json({ error: 'Question is required' })
    }

    const summary = await buildCaseCommandCenter({
      assessmentId: auth.lead.assessmentId,
      leadId: auth.lead.id,
    })
    const result = answerCommandCenterCopilot(summary, question)

    res.json({
      question,
      answer: result.answer,
      sources: result.sources,
    })
  } catch (error: any) {
    logger.error('Failed to answer command center copilot', { error: error.message, leadId: req.params.leadId })
    res.status(500).json({ error: 'Failed to answer command center copilot' })
  }
})

// Get single lead (for mobile app)
router.get('/leads/:leadId', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAuthorizedLead(req, req.params.leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead } = auth
    const assessment = await prisma.assessment.findUnique({
      where: { id: lead.assessmentId },
      include: {
        evidenceFiles: { take: 10 },
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        user: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    })
    const matchingRules = await getMatchingRules()
    const pricingClaimType = getPricingClaimType(assessment)
    const pricingTier = getCaseRoutingPricingForClaimType(matchingRules, pricingClaimType)
    res.json({
      ...lead,
      routingPricing: pricingTier
        ? {
            tierId: pricingTier.id,
            tierLabel: pricingTier.label,
            priceCents: pricingTier.priceCents,
            claimType: pricingClaimType,
            description: pricingTier.description,
          }
        : null,
      assessment: assessment
        ? {
            id: assessment.id,
            claimType: assessment.claimType,
            venueState: assessment.venueState,
            venueCounty: assessment.venueCounty,
            status: assessment.status,
            facts: assessment.facts,
            latestPrediction: assessment.predictions?.[0]
              ? {
                  viability: safeJsonParse<any>(assessment.predictions[0].viability, {}),
                  bands: safeJsonParse<any>(assessment.predictions[0].bands, {})
                }
              : null,
            evidenceCount: assessment.evidenceFiles?.length || 0,
            user: assessment.user,
            userId: assessment.userId
          }
        : null
    })
  } catch (error: any) {
    logger.error('Failed to get lead', { error: error.message })
    res.status(500).json({ error: 'Failed to get lead' })
  }
})

// Accept or reject a lead
router.post('/leads/:leadId/decision', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const { decision, notes, declineReason } = req.body // decision: 'accept' or 'reject'; declineReason for routing learning

    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const attorney = await prisma.attorney.findFirst({
      where: { email: req.user.email }
    })

    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }

    const attorneyId = attorney.id

    const existingLead = await prisma.leadSubmission.findUnique({
      where: { id: leadId }
    })

    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' })
    }

    const isShared = existingLead.assignmentType === 'shared'
    const isAssigned = existingLead.assignedAttorneyId === attorneyId
    const intro = await prisma.introduction.findFirst({
      where: {
        assessmentId: existingLead.assessmentId,
        attorneyId
      }
    })

    if (!isShared && !isAssigned && !intro) {
      return res.status(403).json({ error: 'Not authorized to update this lead' })
    }

    const lead = await prisma.leadSubmission.update({
      where: { id: leadId },
      data: {
        status: decision === 'accept' ? 'contacted' : 'rejected',
        assignedAttorneyId: decision === 'accept' ? attorneyId : null,
        assignmentType: decision === 'accept' ? 'exclusive' : existingLead.assignmentType,
        lifecycleState: decision === 'accept' ? 'attorney_matched' : 'routing_active',
        routingLocked: decision === 'accept',
        ...(decision === 'accept' ? { lastContactAt: new Date() } : {})
      }
    })

    // Sync Introduction status so tier routing waitForOfferResponse sees it
    if (intro) {
      const introUpdate: Record<string, unknown> = {
        status: decision === 'accept' ? 'ACCEPTED' : 'DECLINED',
        respondedAt: new Date()
      }
      if (decision === 'reject' && declineReason) {
        introUpdate.declineReason = declineReason
      }
      await prisma.introduction.update({
        where: { id: intro.id },
        data: introUpdate as any
      })
      // Record routing event for analytics, admin dashboard, and matching algorithm
      if (decision === 'reject') {
        await recordRoutingEvent(existingLead.assessmentId, intro.id, attorneyId, 'declined', {
          declineReason: declineReason || notes || null
        })
      } else if (decision === 'accept') {
        await recordRoutingEvent(existingLead.assessmentId, intro.id, attorneyId, 'accepted', {})
        const revenueProjection = await buildRevenueProjection(existingLead.assessmentId)
        if (revenueProjection) {
          await recordRoutingEvent(existingLead.assessmentId, intro.id, attorneyId, 'revenue_projected', revenueProjection)
        }
      }
    }

    // Update dashboard metrics
    await prisma.attorneyDashboard.upsert({
      where: { attorneyId },
      update: {
        totalLeadsAccepted: {
          increment: decision === 'accept' ? 1 : 0
        }
      },
      create: {
        attorneyId,
        totalLeadsAccepted: decision === 'accept' ? 1 : 0
      }
    })

    if (decision === 'accept') {
      // Notify plaintiff that attorney accepted
      try {
        const attorneyWithFirm = await prisma.attorney.findUnique({
          where: { id: attorneyId },
          include: { lawFirm: true }
        })
        const profile = await prisma.attorneyProfile.findUnique({
          where: { attorneyId }
        })
        await sendPlaintiffAttorneyAccepted(
          existingLead.assessmentId,
          attorneyId,
          attorney.name,
          attorneyWithFirm?.lawFirm?.name,
          profile?.yearsExperience ?? undefined
        )
      } catch (notifyErr: any) {
        logger.error('Failed to notify plaintiff of acceptance', { error: notifyErr.message })
      }

      // Phase 0+: auto-export the accepted case to the firm's connected CMS platforms.
      try {
        const acceptingAttorney = await prisma.attorney.findUnique({
          where: { id: attorneyId },
          select: { lawFirmId: true },
        })
        const firmId = acceptingAttorney?.lawFirmId
        if (firmId) {
          const cmsConnections = await prisma.cmsConnection.findMany({
            where: { lawFirmId: firmId, status: 'connected' },
            select: { id: true },
          })
          for (const conn of cmsConnections) {
            void exportCaseToConnectionSafe({
              connectionId: conn.id,
              assessmentId: existingLead.assessmentId,
              actorAttorneyId: attorneyId,
            })
          }
        }
      } catch (cmsErr: any) {
        logger.warn('CMS auto-export trigger failed', { error: cmsErr?.message })
      }

      try {
        const assessment = await prisma.assessment.findUnique({
          where: { id: existingLead.assessmentId },
          include: { evidenceFiles: true }
        })

        if (assessment && !assessment.chatgptAnalysis) {
          const caseData = JSON.parse(assessment.facts)
          const evidenceData = assessment.evidenceFiles.map(file => ({
            id: file.id,
            filename: file.filename,
            category: file.category,
            processingStatus: file.processingStatus,
            summary: file.aiSummary || null,
            highlights: file.aiHighlights ? JSON.parse(file.aiHighlights) : null
          }))

          const analysisRequest: CaseAnalysisRequest = {
            assessmentId: assessment.id,
            caseData: {
              ...caseData,
              evidence: evidenceData
            }
          }

          const analysisResult = await analyzeCaseWithChatGPT(analysisRequest)

          await prisma.assessment.update({
            where: { id: assessment.id },
            data: {
              chatgptAnalysis: JSON.stringify(analysisResult),
              chatgptAnalysisDate: new Date()
            }
          })
        }
      } catch (analysisError: any) {
        logger.error('Failed to generate ChatGPT analysis on accept', { error: analysisError.message })
      }
    }

    const rationale =
      decision === 'reject' && declineReason
        ? notes
          ? `${declineReason}: ${notes}`
          : declineReason
        : notes || null

    await syncDecisionMemoryForAssessment({
      assessmentId: existingLead.assessmentId,
      attorneyId,
      attorneyDecision: decision,
      attorneyRationale: rationale,
      ...(decision === 'reject'
        ? { outcomeStatus: 'lost', outcomeNotes: rationale }
        : {})
    })
    await calculateAttorneyReputationScore(attorneyId).catch((err: any) => {
      logger.warn('Failed to recalculate attorney reputation after lead decision', { error: err?.message, attorneyId })
    })

    res.json(lead)
  } catch (error: any) {
    logger.error('Failed to update lead decision', { error: error.message })
    res.status(500).json({ error: 'Failed to update lead decision' })
  }
})

// Transfer an accepted lead to another attorney in the same firm
router.post('/leads/:leadId/transfer', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const { attorneyId: targetAttorneyId } = req.body

    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (!targetAttorneyId) {
      return res.status(400).json({ error: 'Target attorney is required' })
    }

    const currentAttorney = await prisma.attorney.findFirst({
      where: { email: req.user.email }
    })

    if (!currentAttorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }

    if (!currentAttorney.lawFirmId) {
      return res.status(404).json({ error: 'No law firm associated with this attorney' })
    }

    const lead = await prisma.leadSubmission.findUnique({
      where: { id: leadId }
    })

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' })
    }

    if (lead.assignedAttorneyId !== currentAttorney.id) {
      return res.status(403).json({ error: 'Only the assigned attorney can transfer this lead' })
    }

    const targetAttorney = await prisma.attorney.findUnique({
      where: { id: targetAttorneyId }
    })

    if (!targetAttorney || targetAttorney.lawFirmId !== currentAttorney.lawFirmId) {
      return res.status(404).json({ error: 'Target attorney not found in your firm' })
    }

    const updated = await prisma.leadSubmission.update({
      where: { id: leadId },
      data: {
        assignedAttorneyId: targetAttorney.id,
        assignmentType: 'exclusive'
      }
    })

    const currentDashboard = await prisma.attorneyDashboard.findUnique({
      where: { attorneyId: currentAttorney.id }
    })

    if (currentDashboard && currentDashboard.totalLeadsAccepted > 0) {
      await prisma.attorneyDashboard.update({
        where: { attorneyId: currentAttorney.id },
        data: {
          totalLeadsAccepted: {
            decrement: 1
          }
        }
      })
    }

    await prisma.attorneyDashboard.upsert({
      where: { attorneyId: targetAttorney.id },
      update: {
        totalLeadsAccepted: {
          increment: 1
        }
      },
      create: {
        attorneyId: targetAttorney.id,
        totalLeadsAccepted: 1
      }
    })

    res.json(updated)
  } catch (error: any) {
    logger.error('Failed to transfer lead', { error: error.message })
    res.status(500).json({ error: 'Failed to transfer lead' })
  }
})

// Update lead status (consulted/retained/etc.)
router.post('/leads/:leadId/status', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const { status } = req.body

    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const allowedStatuses = ['contacted', 'consulted', 'retained']
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    const attorney = await prisma.attorney.findFirst({
      where: { email: req.user.email }
    })

    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }

    const attorneyId = attorney.id

    const existingLead = await prisma.leadSubmission.findUnique({
      where: { id: leadId }
    })

    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' })
    }

    const isShared = existingLead.assignmentType === 'shared'
    const isAssigned = existingLead.assignedAttorneyId === attorneyId
    const intro = await prisma.introduction.findFirst({
      where: {
        assessmentId: existingLead.assessmentId,
        attorneyId
      }
    })

    if (!isShared && !isAssigned && !intro) {
      return res.status(403).json({ error: 'Not authorized to update this lead' })
    }

    const lead = await prisma.leadSubmission.update({
      where: { id: leadId },
      data: {
        status,
        assignedAttorneyId: existingLead.assignedAttorneyId || attorneyId,
        convertedAt: status === 'retained' ? new Date() : existingLead.convertedAt,
        lifecycleState: status === 'retained'
          ? 'engaged'
          : status === 'consulted'
            ? 'consultation_scheduled'
            : 'attorney_matched',
        routingLocked: status === 'retained' ? true : existingLead.routingLocked
      }
    })

    await applyTaskSlaTemplates(attorneyId, existingLead.assessmentId, status)

    if (status === 'retained') {
      const intro = await prisma.introduction.findFirst({
        where: {
          assessmentId: existingLead.assessmentId,
          attorneyId
        },
        select: { id: true }
      })
      const revenueProjection = await buildRevenueProjection(existingLead.assessmentId)
      await recordRoutingEvent(existingLead.assessmentId, intro?.id ?? null, attorneyId, 'revenue_realized', {
        leadId,
        status,
        ...(revenueProjection || {})
      })
      await syncDecisionMemoryForAssessment({
        assessmentId: existingLead.assessmentId,
        attorneyId,
        outcomeStatus: 'retained',
        outcomeNotes: 'Lead marked retained from attorney dashboard status update'
      })
    }

    await calculateAttorneyReputationScore(attorneyId).catch((err: any) => {
      logger.warn('Failed to recalculate attorney reputation after status update', { error: err?.message, attorneyId })
    })

    res.json(lead)
  } catch (error: any) {
    logger.error('Failed to update lead status', { error: error.message })
    res.status(500).json({ error: 'Failed to update lead status' })
  }
})

router.patch('/leads/:leadId/plaintiff-status', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const { status, message } = req.body || {}
    const allowedStatuses = ['INTAKE', 'UNDER_REVIEW', 'FILED', 'NEGOTIATION', 'SETTLED', 'TRIAL', 'CLOSED']
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid plaintiff status' })
    }

    const auth = await getAuthorizedLead(req, leadId)
    if (auth.error) {
      return res.status(auth.error.status).json({ error: auth.error.message })
    }
    const { lead, attorney } = auth

    const assessment = await prisma.assessment.update({
      where: { id: lead.assessmentId },
      data: { status },
      select: { id: true, status: true, userId: true }
    })

    if (message && assessment.userId) {
      await prisma.caseNote.create({
        data: {
          assessmentId: assessment.id,
          authorId: req.user.id,
          authorName: attorney.name || attorney.email || 'Attorney',
          authorEmail: attorney.email,
          noteType: 'client_update',
          message
        }
      }).catch((error: any) => logger.warn('Failed to record plaintiff status note', { error: error?.message, leadId }))
    }

    res.json({ leadId, assessmentId: assessment.id, status: assessment.status, message: message || null, updatedAt: new Date().toISOString() })
  } catch (error: any) {
    logger.error('Failed to update plaintiff status', { error: error.message, leadId: req.params.leadId })
    res.status(500).json({ error: 'Failed to update plaintiff status' })
  }
})

// ROI and Analytics endpoints

// Get ROI dashboard data
router.get('/analytics/roi', authMiddleware, async (req: any, res) => {
  try {
    const attorneyId = req.user.id
    const { period = 'monthly', startDate, endDate } = req.query

    const dashboard = await prisma.attorneyDashboard.findUnique({
      where: { attorneyId }
    })

    if (!dashboard) {
      return res.json({
        totalFees: 0,
        totalSpend: 0,
        roi: 0,
        averageFee: 0,
        conversionRate: 0
      })
    }

    // Get lead analytics for the period
    const analytics = await prisma.leadAnalytics.findMany({
      where: {
        attorneyId,
        periodType: period,
        ...(startDate && endDate && {
          periodStart: { gte: new Date(startDate as string) },
          periodEnd: { lte: new Date(endDate as string) }
        })
      },
      orderBy: { periodStart: 'desc' }
    })

    const totalFees = analytics.reduce((sum, a) => sum + a.totalFees, 0)
    const totalSpend = analytics.reduce((sum, a) => sum + a.platformSpend, 0)
    const totalLeads = analytics.reduce((sum, a) => sum + a.totalLeads, 0)
    const totalConverted = analytics.reduce((sum, a) => sum + a.leadsConverted, 0)

    res.json({
      totalFees,
      totalSpend,
      roi: totalSpend > 0 ? (totalFees / totalSpend) : 0,
      averageFee: totalConverted > 0 ? (totalFees / totalConverted) : 0,
      conversionRate: totalLeads > 0 ? (totalConverted / totalLeads) * 100 : 0,
      periodAnalytics: analytics
    })
  } catch (error: any) {
    logger.error('Failed to get ROI analytics', { error: error.message })
    res.status(500).json({ error: 'Failed to get ROI analytics' })
  }
})

// Get conversion funnel metrics
router.get('/analytics/funnel', authMiddleware, async (req: any, res) => {
  try {
    const attorneyId = req.user.id
    const { period = 'monthly' } = req.query

    const analytics = await prisma.leadAnalytics.findMany({
      where: {
        attorneyId,
        periodType: period
      },
      orderBy: { periodStart: 'desc' },
      take: 12 // Last 12 periods
    })

    const funnelData = analytics.map(analytics => ({
      period: analytics.periodStart,
      leads: analytics.totalLeads,
      contacted: analytics.leadsAccepted,
      consulted: Math.floor(analytics.leadsAccepted * 0.8), // Estimated
      retained: analytics.leadsConverted,
      conversionRate: analytics.totalLeads > 0 ? 
        (analytics.leadsConverted / analytics.totalLeads) * 100 : 0
    }))

    res.json({
      funnelData,
      averageConversionRate: funnelData.reduce((sum, f) => sum + f.conversionRate, 0) / funnelData.length || 0
    })
  } catch (error: any) {
    logger.error('Failed to get funnel analytics', { error: error.message })
    res.status(500).json({ error: 'Failed to get funnel analytics' })
  }
})

router.get('/analytics/intelligence', authMiddleware, async (req: any, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // JWT stores the User id, while attorney analytics is keyed by the Attorney row.
    // Match the rest of the attorney routes and resolve the attorney by shared email.
    const attorney = await prisma.attorney.findFirst({
      where: { email: req.user.email },
      select: attorneyIdentitySelect
    })
    if (!attorney) {
      return res.status(403).json({ error: 'Attorney profile not found' })
    }

    const leads = await prisma.leadSubmission.findMany({
      where: { assignedAttorneyId: attorney.id },
      orderBy: { submittedAt: 'desc' },
      take: 200,
      select: analyticsLeadSelect
    })

    const assessmentIds = leads.map(lead => lead.assessmentId)
    const [invoices, payments, negotiations] = assessmentIds.length
      ? await Promise.all([
          prisma.billingInvoice.findMany({
            where: { assessmentId: { in: assessmentIds } },
            select: analyticsInvoiceSelect
          }),
          prisma.billingPayment.findMany({
            where: { assessmentId: { in: assessmentIds } },
            select: analyticsPaymentSelect
          }),
          prisma.negotiationEvent.findMany({
            where: { assessmentId: { in: assessmentIds } },
            orderBy: { eventDate: 'asc' },
            select: analyticsNegotiationSelect
          })
        ])
      : [[], [], []]

    const invoicesByAssessment = invoices.reduce<Record<string, number>>((acc, invoice) => {
      acc[invoice.assessmentId] = (acc[invoice.assessmentId] || 0) + (invoice.amount || 0)
      return acc
    }, {})
    const paymentsByAssessment = payments.reduce<Record<string, number>>((acc, payment) => {
      acc[payment.assessmentId] = (acc[payment.assessmentId] || 0) + (payment.amount || 0)
      return acc
    }, {})
    const lastDemandByAssessment = negotiations.reduce<Record<string, number | null>>((acc, event) => {
      if (event.eventType === 'demand') {
        acc[event.assessmentId] = event.amount || null
      }
      return acc
    }, {})
    const lastAcceptedByAssessment = negotiations.reduce<Record<string, number | null>>((acc, event) => {
      if (event.status === 'accepted') {
        acc[event.assessmentId] = event.amount || null
      }
      return acc
    }, {})

    const caseLevel = leads.map(lead => {
      const assessment = lead.assessment as any
      const cost = invoicesByAssessment[lead.assessmentId] || 0
      const outcome = paymentsByAssessment[lead.assessmentId] || 0
      const lastDemand = lastDemandByAssessment[lead.assessmentId] || null
      const lastAccepted = lastAcceptedByAssessment[lead.assessmentId] || null
      const settlementEfficiency = lastDemand && lastAccepted ? Math.round((lastAccepted / lastDemand) * 100) : null
      const durationDays = lead.submittedAt
        ? Math.ceil((Number(lead.convertedAt || new Date()) - Number(lead.submittedAt)) / (1000 * 60 * 60 * 24))
        : null

      return {
        leadId: lead.id,
        assessmentId: lead.assessmentId,
        claimType: assessment?.claimType || 'unknown',
        venueState: assessment?.venueState || null,
        cost,
        outcome,
        durationDays,
        settlementEfficiency
      }
    })

    let firmLevel = null
    if (attorney.lawFirmId) {
      const firmAttorneys = await prisma.attorney.findMany({
        where: { lawFirmId: attorney.lawFirmId },
        select: { id: true, name: true }
      })
      const firmAttorneyIds = firmAttorneys.map(item => item.id)
      const firmAttorneyNameById = Object.fromEntries(firmAttorneys.map(item => [item.id, item.name || 'Unassigned']))
      const firmLeads = await prisma.leadSubmission.findMany({
        where: { assignedAttorneyId: { in: firmAttorneyIds } },
        orderBy: { submittedAt: 'desc' },
        take: 500,
        select: analyticsLeadSelect
      })

      const firmAssessmentIds = firmLeads.map(lead => lead.assessmentId)
      const [firmInvoices, firmPayments, firmInsurance, analytics] = await Promise.all([
        firmAssessmentIds.length
          ? prisma.billingInvoice.findMany({
              where: { assessmentId: { in: firmAssessmentIds } },
              select: analyticsInvoiceSelect
            })
          : Promise.resolve([]),
        firmAssessmentIds.length
          ? prisma.billingPayment.findMany({
              where: { assessmentId: { in: firmAssessmentIds } },
              select: analyticsPaymentSelect
            })
          : Promise.resolve([]),
        firmAssessmentIds.length
          ? prisma.insuranceDetail.findMany({
              where: { assessmentId: { in: firmAssessmentIds } },
              select: analyticsInsuranceSelect
            })
          : Promise.resolve([]),
        prisma.leadAnalytics.findMany({
          where: { attorneyId: attorney.id },
          orderBy: { periodStart: 'desc' },
          take: 6,
          select: analyticsForecastSelect
        })
      ])

      const firmInvoiceTotals = firmInvoices.reduce<Record<string, number>>((acc, invoice) => {
        acc[invoice.assessmentId] = (acc[invoice.assessmentId] || 0) + (invoice.amount || 0)
        return acc
      }, {})
      const firmPaymentTotals = firmPayments.reduce<Record<string, number>>((acc, payment) => {
        acc[payment.assessmentId] = (acc[payment.assessmentId] || 0) + (payment.amount || 0)
        return acc
      }, {})

      const profitabilityByCaseType = firmLeads.reduce<Record<string, { revenue: number; cost: number; profit: number; count: number }>>((acc, lead) => {
        const claimType = (lead.assessment as any)?.claimType || 'unknown'
        const revenue = firmPaymentTotals[lead.assessmentId] || 0
        const cost = firmInvoiceTotals[lead.assessmentId] || 0
        const entry = acc[claimType] || { revenue: 0, cost: 0, profit: 0, count: 0 }
        entry.revenue += revenue
        entry.cost += cost
        entry.profit += revenue - cost
        entry.count += 1
        acc[claimType] = entry
        return acc
      }, {})

      const attorneyPerformance = firmLeads.reduce<Record<string, { name: string; total: number; retained: number }>>((acc, lead) => {
        const key = lead.assignedAttorneyId || 'unassigned'
        const entry = acc[key] || { name: firmAttorneyNameById[key] || 'Unassigned', total: 0, retained: 0 }
        entry.total += 1
        entry.retained += lead.status === 'retained' ? 1 : 0
        acc[key] = entry
        return acc
      }, {})

      const roiByInsurer = firmInsurance.reduce<Record<string, { revenue: number; cost: number; roi: number }>>((acc, item) => {
        const key = item.carrierName || 'Unknown'
        const revenue = firmPaymentTotals[item.assessmentId] || 0
        const cost = firmInvoiceTotals[item.assessmentId] || 0
        const entry = acc[key] || { revenue: 0, cost: 0, roi: 0 }
        entry.revenue += revenue
        entry.cost += cost
        entry.roi = entry.cost > 0 ? entry.revenue / entry.cost : 0
        acc[key] = entry
        return acc
      }, {})

      const roiByAdjuster = firmInsurance.reduce<Record<string, { revenue: number; cost: number; roi: number }>>((acc, item) => {
        const key = item.adjusterName || 'Unknown'
        const revenue = firmPaymentTotals[item.assessmentId] || 0
        const cost = firmInvoiceTotals[item.assessmentId] || 0
        const entry = acc[key] || { revenue: 0, cost: 0, roi: 0 }
        entry.revenue += revenue
        entry.cost += cost
        entry.roi = entry.cost > 0 ? entry.revenue / entry.cost : 0
        acc[key] = entry
        return acc
      }, {})

      const roiByVenue = firmLeads.reduce<Record<string, { revenue: number; cost: number; roi: number }>>((acc, lead) => {
        const venue = (lead.assessment as any)?.venueState || 'Unknown'
        const revenue = firmPaymentTotals[lead.assessmentId] || 0
        const cost = firmInvoiceTotals[lead.assessmentId] || 0
        const entry = acc[venue] || { revenue: 0, cost: 0, roi: 0 }
        entry.revenue += revenue
        entry.cost += cost
        entry.roi = entry.cost > 0 ? entry.revenue / entry.cost : 0
        acc[venue] = entry
        return acc
      }, {})
      const avgFees = analytics.length
        ? analytics.reduce((sum, item) => sum + item.totalFees, 0) / analytics.length
        : 0
      const avgSpend = analytics.length
        ? analytics.reduce((sum, item) => sum + item.platformSpend, 0) / analytics.length
        : 0
      const forecast = {
        nextQuarterFees: Math.round(avgFees * 3),
        nextQuarterSpend: Math.round(avgSpend * 3),
        projectedRoi: avgSpend > 0 ? avgFees / avgSpend : 0
      }

      firmLevel = {
        profitabilityByCaseType,
        attorneyPerformance,
        roiByInsurer,
        roiByVenue,
        roiByAdjuster,
        forecast
      }
    }

    res.json({
      caseLevel,
      firmLevel
    })
  } catch (error: any) {
    logger.error('Failed to load analytics intelligence', { error: error.message })
    res.status(500).json({ error: 'Failed to load analytics intelligence' })
  }
})

// --- Attorney Messaging ---

// Get attorney's chat rooms (plaintiff conversations)
router.get('/messaging/chat-rooms', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAttorneyFromReq(req)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const { attorney } = auth

    const chatRooms = await prisma.chatRoom.findMany({
      where: { attorneyId: attorney.id },
      select: chatRoomSummarySelect,
      orderBy: { lastMessageAt: 'desc' }
    })

    const assessmentIds = chatRooms.map(r => r.assessmentId).filter(Boolean) as string[]
    const roomIds = chatRooms.map(r => r.id)
    const [leadRows, unreadByRoom] = await Promise.all([
      assessmentIds.length > 0
        ? prisma.leadSubmission.findMany({
            where: { assessmentId: { in: assessmentIds } },
            select: { id: true, assessmentId: true }
          })
        : Promise.resolve([]),
      roomIds.length > 0
        ? prisma.message.groupBy({
            by: ['chatRoomId'],
            where: {
              chatRoomId: { in: roomIds },
              senderType: 'user',
              isRead: false
            },
            _count: { id: true }
          })
        : Promise.resolve([])
    ])
    const leadByAssessment: Record<string, string> = Object.fromEntries(
      leadRows.map(l => [l.assessmentId, l.id])
    )
    const unreadMap = Object.fromEntries(unreadByRoom.map(u => [u.chatRoomId, u._count.id]))

    const parsed = await Promise.all(chatRooms.map(async room => {
      let lastMessage = room.messages[0]
        ? { content: room.messages[0].content, senderType: room.messages[0].senderType, createdAt: room.messages[0].createdAt }
        : null
      // Attorney-facing views are English-only: translate plaintiff previews when needed
      if (lastMessage && lastMessage.senderType !== 'attorney' && lastMessage.content && looksNonEnglish(lastMessage.content)) {
        lastMessage = { ...lastMessage, content: await translateToEnglish(lastMessage.content) }
      }
      return {
        id: room.id,
        leadId: room.assessmentId ? leadByAssessment[room.assessmentId] : null,
        plaintiff: room.user ? { id: room.user.id, name: `${room.user.firstName || ''} ${room.user.lastName || ''}`.trim() || 'Plaintiff', email: room.user.email } : null,
        assessment: room.assessment,
        lastMessage,
        lastMessageAt: room.lastMessageAt,
        unreadCount: unreadMap[room.id] || 0
      }
    }))

    res.json(parsed)
  } catch (error: any) {
    logger.error('Failed to load attorney chat rooms', { error: error.message })
    res.status(500).json({ error: 'Failed to load chat rooms' })
  }
})

// Get unread message count for attorney
router.get('/messaging/unread-count', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAttorneyFromReq(req)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const { attorney } = auth

    const count = await prisma.message.count({
      where: {
        chatRoom: { attorneyId: attorney.id },
        senderType: 'user',
        isRead: false
      }
    })

    res.json({ unreadCount: count })
  } catch (error: any) {
    logger.error('Failed to get unread count', { error: error.message })
    res.status(500).json({ error: 'Failed to get unread count' })
  }
})

// Get or create chat room for lead (userId from assessment)
router.post('/messaging/chat-room', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAttorneyFromReq(req)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const { attorney } = auth
    const { assessmentId } = req.body
    let { userId } = req.body

    // The attorney UI doesn't always have the plaintiff's user id loaded on the
    // lead (some lists omit the nested user object), which previously made chat
    // wrongly report "no account". Resolve the plaintiff's user id from the
    // assessment when it isn't supplied so messaging works whenever the case is
    // linked to an account.
    if (!userId && assessmentId) {
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
        select: { userId: true },
      })
      userId = assessment?.userId || undefined
    }

    if (!userId) {
      return res.status(409).json({ error: 'This plaintiff has not created an account yet, so in-app messaging is unavailable.' })
    }

    let chatRoom = await prisma.chatRoom.findUnique({
      where: { userId_attorneyId: { userId, attorneyId: attorney.id } },
      select: chatRoomDetailSelect
    })

    if (!chatRoom) {
      chatRoom = await prisma.chatRoom.create({
        data: { userId, attorneyId: attorney.id, assessmentId },
        select: chatRoomDetailSelect
      })
    }

    chatRoom.messages = (chatRoom.messages as any[]).reverse()

    // Attorney-facing views are English-only: translate plaintiff messages when needed
    chatRoom.messages = await Promise.all(
      (chatRoom.messages as any[]).map(async (m: any) => {
        if (m.senderType !== 'attorney' && m.content && looksNonEnglish(m.content)) {
          return { ...m, content: await translateToEnglish(m.content) }
        }
        return m
      })
    ) as any

    res.json({
      chatRoomId: chatRoom.id,
      plaintiff: chatRoom.user ? { id: chatRoom.user.id, name: `${chatRoom.user.firstName || ''} ${chatRoom.user.lastName || ''}`.trim() || 'Plaintiff', email: chatRoom.user.email } : null,
      assessment: chatRoom.assessment,
      messages: chatRoom.messages,
      lastMessageAt: chatRoom.lastMessageAt
    })
  } catch (error: any) {
    logger.error('Failed to get/create chat room', { error: error.message })
    res.status(500).json({ error: 'Failed to get or create chat room' })
  }
})

// Get messages for chat room (attorney must own room)
router.get('/messaging/chat-room/:chatRoomId/messages', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAttorneyFromReq(req)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const { chatRoomId } = req.params
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const offset = parseInt(req.query.offset as string) || 0

    const chatRoom = await prisma.chatRoom.findFirst({
      where: { id: chatRoomId, attorneyId: auth.attorney.id },
      select: chatRoomOwnershipSelect
    })
    if (!chatRoom) return res.status(404).json({ error: 'Chat room not found' })

    const messages = await prisma.message.findMany({
      where: { chatRoomId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: chatMessageSelect
    })
    messages.reverse()

    // Attorney-facing views are English-only: translate plaintiff messages when needed
    const translated = await Promise.all(
      messages.map(async (m: any) => {
        if (m.senderType !== 'attorney' && m.content && looksNonEnglish(m.content)) {
          return { ...m, content: await translateToEnglish(m.content) }
        }
        return m
      })
    )

    res.json(translated)
  } catch (error: any) {
    logger.error('Failed to load messages', { error: error.message })
    res.status(500).json({ error: 'Failed to load messages' })
  }
})

// Send message as attorney
router.post('/messaging/send', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAttorneyFromReq(req)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const { chatRoomId, content, messageType } = req.body

    if (!chatRoomId || !content?.trim()) return res.status(400).json({ error: 'chatRoomId and content required' })

    const chatRoom = await prisma.chatRoom.findFirst({
      where: { id: chatRoomId, attorneyId: auth.attorney.id },
      select: chatRoomOwnershipSelect
    })
    if (!chatRoom) return res.status(404).json({ error: 'Chat room not found' })

    const message = await prisma.message.create({
      data: {
        chatRoomId,
        senderId: auth.attorney.id,
        senderType: 'attorney',
        content: content.trim(),
        messageType: messageType || 'text'
      },
      select: {
        id: true,
        content: true,
        senderType: true,
        createdAt: true
      }
    })

    await prisma.chatRoom.update({
      where: { id: chatRoomId },
      data: { lastMessageAt: new Date() }
    })

    res.status(201).json({
      messageId: message.id,
      chatRoomId,
      content: message.content,
      senderType: message.senderType,
      createdAt: message.createdAt
    })
  } catch (error: any) {
    logger.error('Failed to send message', { error: error.message })
    res.status(500).json({ error: 'Failed to send message' })
  }
})

// Mark messages as read (attorney read plaintiff messages)
router.put('/messaging/chat-room/:chatRoomId/read', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAttorneyFromReq(req)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })
    const { chatRoomId } = req.params

    const chatRoom = await prisma.chatRoom.findFirst({
      where: { id: chatRoomId, attorneyId: auth.attorney.id },
      select: chatRoomOwnershipSelect
    })
    if (!chatRoom) return res.status(404).json({ error: 'Chat room not found' })

    await prisma.message.updateMany({
      where: { chatRoomId, senderType: 'user', isRead: false },
      data: { isRead: true, readAt: new Date() }
    })

    res.json({ success: true })
  } catch (error: any) {
    logger.error('Failed to mark messages read', { error: error.message })
    res.status(500).json({ error: 'Failed to mark messages read' })
  }
})

// Message templates for attorneys
const MESSAGE_TEMPLATES = [
  { id: 'request_police_report', label: 'Request police report', text: 'Hi, could you please upload a copy of the police report from your accident? This will help us build a stronger case.' },
  { id: 'request_medical_bills', label: 'Request medical bills', text: 'Please upload your medical bills and records so we can accurately assess your damages.' },
  { id: 'schedule_consultation', label: 'Schedule consultation', text: 'I\'d like to schedule a consultation to discuss your case. What times work best for you this week?' },
  { id: 'follow_up_reminder', label: 'Follow-up reminder', text: 'Just following up on my previous message. Please let me know when you have a chance to respond.' }
]

router.get('/messaging/templates', authMiddleware, async (req: any, res) => {
  try {
    const auth = await getAttorneyFromReq(req)
    if (auth.error) return res.status(auth.error.status).json({ error: auth.error.message })

    const leadId = typeof req.query?.leadId === 'string' ? req.query.leadId : null
    if (!leadId) {
      return res.json(MESSAGE_TEMPLATES)
    }

    const leadAuth = await getAuthorizedLead(req, leadId)
    if (leadAuth.error) {
      return res.status(leadAuth.error.status).json({ error: leadAuth.error.message })
    }

    const summary = await buildCaseCommandCenter({
      assessmentId: leadAuth.lead.assessmentId,
      leadId: leadAuth.lead.id,
    })
    const templates = buildCaseAwareMessageTemplates(summary)
    res.json(templates)
  } catch (error: any) {
    logger.error('Failed to load message templates', { error: error.message })
    res.status(500).json({ error: 'Failed to load templates' })
  }
})

export default router
