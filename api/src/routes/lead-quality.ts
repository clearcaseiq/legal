import { Router } from 'express'
import { authMiddleware } from '../lib/auth'
import { logger } from '../lib/logger'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

const router = Router()

// Quality Report endpoints

// Report lead quality issue
router.post('/report', authMiddleware, async (req: any, res) => {
  try {
    const attorneyId = req.user.id
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
    const attorneyId = req.user.id
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
    const attorneyId = req.user.id
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
    
    // Simulate conflict check (in real implementation, this would check against attorney's case database)
    const conflictCheck = await simulateConflictCheck(attorneyId, facts)

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
    const attorneyId = req.user.id
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
    const attorneyId = req.user.id
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
    const attorneyId = req.user.id
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

async function simulateConflictCheck(attorneyId: string, facts: any) {
  // This is a simplified simulation - in real implementation, this would:
  // 1. Check against attorney's existing cases
  // 2. Check against opposing parties
  // 3. Check for concurrent representation conflicts
  // 4. Check for adverse interests

  const conflicts = []
  let conflictType = 'none'
  let riskLevel = 'low'

  // Simulate checking for opposing party conflicts
  if (facts.opposingParty) {
    // In real implementation, check if attorney represents opposing party
    if (Math.random() > 0.9) { // 10% chance of conflict
      conflicts.push({
        type: 'opposing_party',
        description: `Potential conflict with opposing party: ${facts.opposingParty}`,
        severity: 'high'
      })
      conflictType = 'adverse'
      riskLevel = 'high'
    }
  }

  // Simulate checking for concurrent representation
  if (Math.random() > 0.95) { // 5% chance of concurrent conflict
    conflicts.push({
      type: 'concurrent_representation',
      description: 'Attorney may be representing multiple parties with conflicting interests',
      severity: 'medium'
    })
    conflictType = 'concurrent'
    riskLevel = 'medium'
  }

  return {
    conflictType,
    riskLevel,
    details: {
      conflicts,
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
