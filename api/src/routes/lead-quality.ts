import { Router } from 'express'
import { authMiddleware } from '../lib/auth'
import { logger } from '../lib/logger'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { getHeuristics } from '../lib/heuristics-config'

const router = Router()

/**
 * Leads are assigned to Attorney records, but req.user is a User record.
 * The two share an email, not an id — resolving by email here keeps access
 * checks correct (previously this compared a User id to assignedAttorneyId).
 */
async function resolveAttorneyId(req: any): Promise<string | null> {
  const email = String(req.user?.email || '').trim()
  if (!email) return null
  const attorney = await prisma.attorney.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true },
  })
  return attorney?.id ?? null
}

// Quality Report endpoints

// Report lead quality issue
router.post('/report', authMiddleware, async (req: any, res) => {
  try {
    const attorneyId = await resolveAttorneyId(req)
    if (!attorneyId) {
      return res.status(403).json({ error: 'No attorney record found for this account' })
    }
    const { leadId, overallQuality, qualityScore, issues, isSpam, isDuplicate, reportReason } = req.body

    // Validate lead exists and attorney has access
    const lead = await prisma.leadSubmission.findFirst({
      where: {
        id: leadId,
        OR: [
          { assignedAttorneyId: attorneyId },
          { assignmentType: 'shared' }
        ]
      }
    })

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found or access denied' })
    }

    const qualityReport = await prisma.qualityReport.create({
      data: {
        leadId,
        overallQuality,
        qualityScore,
        issues: issues ? JSON.stringify(issues) : null,
        isSpam,
        isDuplicate,
        reportedBy: attorneyId,
        reportReason
      }
    })

    // If marked as spam or duplicate, automatically issue credit
    let creditIssued = 0
    if (isSpam || isDuplicate) {
      creditIssued = 50 // $50 credit for spam/duplicate leads
      await prisma.qualityReport.update({
        where: { id: qualityReport.id },
        data: { 
          creditIssued,
          status: 'resolved',
          resolution: 'Credit issued for spam/duplicate lead'
        }
      })
    }

    res.json({
      qualityReport,
      creditIssued
    })
  } catch (error: any) {
    logger.error('Failed to report lead quality', { error: error.message })
    res.status(500).json({ error: 'Failed to report quality issue' })
  }
})

// Get quality reports for attorney
router.get('/reports', authMiddleware, async (req: any, res) => {
  try {
    const attorneyId = await resolveAttorneyId(req)
    if (!attorneyId) {
      return res.status(403).json({ error: 'No attorney record found for this account' })
    }
    const { status, page = 1, limit = 20 } = req.query

    const whereClause: any = {
      reportedBy: attorneyId
    }

    if (status) whereClause.status = status

    const reports = await prisma.qualityReport.findMany({
      where: whereClause,
      include: {
        lead: {
          include: {
            assessment: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string)
    })

    const totalCount = await prisma.qualityReport.count({
      where: whereClause
    })

    res.json({
      reports,
      totalCount,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    })
  } catch (error: any) {
    logger.error('Failed to get quality reports', { error: error.message })
    res.status(500).json({ error: 'Failed to get quality reports' })
  }
})

// Conflict Check endpoints

// Run conflict check for a lead
router.post('/conflict-check', authMiddleware, async (req: any, res) => {
  try {
    const attorneyId = await resolveAttorneyId(req)
    if (!attorneyId) {
      return res.status(403).json({ error: 'No attorney record found for this account' })
    }
    const { leadId } = req.body

    // Get lead details
    const lead = await prisma.leadSubmission.findFirst({
      where: {
        id: leadId,
        OR: [
          { assignedAttorneyId: attorneyId },
          { assignmentType: 'shared' }
        ]
      },
      include: {
        assessment: true
      }
    })

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found or access denied' })
    }

    // Parse assessment facts to get case details
    const facts = JSON.parse(lead.assessment.facts)

    // Deterministic screen against the attorney's existing caseload (no simulated randomness)
    const conflictCheck = await runConflictCheck(attorneyId, leadId, facts)

    // Save conflict check result
    const savedCheck = await prisma.conflictCheck.create({
      data: {
        attorneyId,
        leadId,
        conflictType: conflictCheck.conflictType,
        conflictDetails: JSON.stringify(conflictCheck.details),
        riskLevel: conflictCheck.riskLevel
      }
    })

    res.json({
      conflictCheck: savedCheck,
      details: conflictCheck
    })
  } catch (error: any) {
    logger.error('Failed to run conflict check', { error: error.message })
    res.status(500).json({ error: 'Failed to run conflict check' })
  }
})

// Get conflict checks for attorney
router.get('/conflict-checks', authMiddleware, async (req: any, res) => {
  try {
    const attorneyId = await resolveAttorneyId(req)
    if (!attorneyId) {
      return res.status(403).json({ error: 'No attorney record found for this account' })
    }
    const { riskLevel, isResolved, page = 1, limit = 20 } = req.query

    const whereClause: any = {
      attorneyId
    }

    if (riskLevel) whereClause.riskLevel = riskLevel
    if (isResolved !== undefined) whereClause.isResolved = isResolved === 'true'

    const conflictChecks = await prisma.conflictCheck.findMany({
      where: whereClause,
      include: {
        lead: {
          include: {
            assessment: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string)
    })

    const totalCount = await prisma.conflictCheck.count({
      where: whereClause
    })

    res.json({
      conflictChecks,
      totalCount,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    })
  } catch (error: any) {
    logger.error('Failed to get conflict checks', { error: error.message })
    res.status(500).json({ error: 'Failed to get conflict checks' })
  }
})

// Resolve conflict check
router.put('/conflict-checks/:checkId/resolve', authMiddleware, async (req: any, res) => {
  try {
    const { checkId } = req.params
    const attorneyId = await resolveAttorneyId(req)
    if (!attorneyId) {
      return res.status(403).json({ error: 'No attorney record found for this account' })
    }
    const { resolutionNotes } = req.body

    const conflictCheck = await prisma.conflictCheck.findFirst({
      where: {
        id: checkId,
        attorneyId
      }
    })

    if (!conflictCheck) {
      return res.status(404).json({ error: 'Conflict check not found' })
    }

    const updated = await prisma.conflictCheck.update({
      where: { id: checkId },
      data: {
        isResolved: true,
        resolutionNotes,
        resolvedAt: new Date()
      }
    })

    res.json(updated)
  } catch (error: any) {
    logger.error('Failed to resolve conflict check', { error: error.message })
    res.status(500).json({ error: 'Failed to resolve conflict check' })
  }
})

// Evidence Checklist endpoints

// Update evidence checklist for a lead
router.put('/evidence-checklist/:leadId', authMiddleware, async (req: any, res) => {
  try {
    const { leadId } = req.params
    const attorneyId = await resolveAttorneyId(req)
    if (!attorneyId) {
      return res.status(403).json({ error: 'No attorney record found for this account' })
    }
    const { checklist } = req.body

    // Verify attorney has access to lead
    const lead = await prisma.leadSubmission.findFirst({
      where: {
        id: leadId,
        OR: [
          { assignedAttorneyId: attorneyId },
          { assignmentType: 'shared' }
        ]
      }
    })

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found or access denied' })
    }

    const updatedLead = await prisma.leadSubmission.update({
      where: { id: leadId },
      data: {
        evidenceChecklist: JSON.stringify(checklist)
      }
    })

    res.json(updatedLead)
  } catch (error: any) {
    logger.error('Failed to update evidence checklist', { error: error.message })
    res.status(500).json({ error: 'Failed to update evidence checklist' })
  }
})

// Get evidence checklist template
router.get('/evidence-checklist/template', authMiddleware, async (req: any, res) => {
  try {
    const { caseType } = req.query

    // Generate evidence checklist template based on case type
    const checklist = generateEvidenceChecklist(caseType)

    res.json({ checklist })
  } catch (error: any) {
    logger.error('Failed to get evidence checklist template', { error: error.message })
    res.status(500).json({ error: 'Failed to get checklist template' })
  }
})

// Helper functions

const normalizeName = (value: unknown) => String(value || '').trim().toLowerCase()
const normalizePhone = (value: unknown) => String(value || '').replace(/\D/g, '')

function extractParties(facts: any) {
  return {
    plaintiffName: normalizeName(facts?.contact?.name || facts?.plaintiff?.name || facts?.name),
    plaintiffEmail: normalizeName(facts?.contact?.email || facts?.email),
    plaintiffPhone: normalizePhone(facts?.contact?.phone || facts?.phone),
    opposingParty: normalizeName(facts?.opposingParty || facts?.defendant?.name || facts?.defendant),
  }
}

/**
 * Deterministic preliminary conflict screen against the attorney's existing
 * caseload on this platform. This replaces the old random simulation: it only
 * flags conflicts supported by actual data, and the result is reproducible.
 */
async function runConflictCheck(attorneyId: string, leadId: string, facts: any) {
  const conflicts: Array<{ type: string; description: string; severity: string }> = []
  let conflictType = 'none'
  let riskLevel = 'low'

  const incoming = extractParties(facts)

  const heuristics = await getHeuristics()
  const otherLeads = await prisma.leadSubmission.findMany({
    where: {
      assignedAttorneyId: attorneyId,
      id: { not: leadId },
    },
    include: { assessment: true },
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, heuristics.conflictCheck.lookbackCases),
  })

  for (const other of otherLeads) {
    let otherFacts: any = {}
    try {
      otherFacts = JSON.parse(other.assessment?.facts || '{}')
    } catch {
      continue
    }
    const existing = extractParties(otherFacts)

    // Adverse interest: this lead's opposing party is an existing client of the attorney
    if (incoming.opposingParty && existing.plaintiffName && incoming.opposingParty === existing.plaintiffName) {
      conflicts.push({
        type: 'opposing_party',
        description: `Opposing party "${facts?.opposingParty || facts?.defendant?.name || facts?.defendant}" matches an existing client on another matter`,
        severity: 'high'
      })
      conflictType = 'adverse'
      riskLevel = 'high'
    }

    // Same plaintiff already has another matter with this attorney
    const sameEmail = incoming.plaintiffEmail && incoming.plaintiffEmail === existing.plaintiffEmail
    const samePhone = incoming.plaintiffPhone && incoming.plaintiffPhone === existing.plaintiffPhone
    if (sameEmail || samePhone) {
      conflicts.push({
        type: 'duplicate_party',
        description: 'This plaintiff already has another matter assigned to you on the platform',
        severity: 'medium'
      })
      if (conflictType === 'none') {
        conflictType = 'duplicate_party'
        riskLevel = 'medium'
      }
    }
  }

  return {
    conflictType,
    riskLevel,
    details: {
      conflicts,
      scope: 'Preliminary automated screen against your leads on this platform only. Run your firm\'s full conflict check before engagement.',
      casesScreened: otherLeads.length,
      checkedAt: new Date().toISOString(),
      attorneyId
    }
  }
}

function generateEvidenceChecklist(caseType: string) {
  const baseChecklist = [
    { name: 'Police Report', uploaded: false, critical: true, category: 'incident' },
    { name: 'Medical Records', uploaded: false, critical: true, category: 'medical' },
    { name: 'Insurance Information', uploaded: false, critical: false, category: 'insurance' },
    { name: 'Witness Statements', uploaded: false, critical: false, category: 'witness' },
    { name: 'Photos/Videos', uploaded: false, critical: false, category: 'evidence' }
  ]

  switch (caseType?.toLowerCase()) {
    case 'auto_accident':
      return [
        ...baseChecklist,
        { name: 'Vehicle Damage Photos', uploaded: false, critical: true, category: 'evidence' },
        { name: 'DMV Records', uploaded: false, critical: false, category: 'official' },
        { name: 'Traffic Citations', uploaded: false, critical: false, category: 'official' }
      ]
    
    case 'slip_and_fall':
      return [
        ...baseChecklist,
        { name: 'Property Maintenance Records', uploaded: false, critical: false, category: 'property' },
        { name: 'Security Footage', uploaded: false, critical: false, category: 'evidence' },
        { name: 'Weather Reports', uploaded: false, critical: false, category: 'evidence' }
      ]
    
    case 'medical_malpractice':
      return [
        { name: 'Medical Records', uploaded: false, critical: true, category: 'medical' },
        { name: 'Expert Witness Reports', uploaded: false, critical: true, category: 'expert' },
        { name: 'Medical Bills', uploaded: false, critical: true, category: 'financial' },
        { name: 'Insurance Information', uploaded: false, critical: false, category: 'insurance' }
      ]
    
    default:
      return baseChecklist
  }
}

export default router
