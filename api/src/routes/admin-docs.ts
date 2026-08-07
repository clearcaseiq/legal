import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { adminMiddleware } from '../lib/admin-access'
import { writeAdminAudit } from '../lib/admin-audit'
import { safeJsonParse, safeJsonArray } from './admin-shared'

const router: ExpressRouter = Router()

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
