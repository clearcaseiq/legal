import { Router } from 'express'
import { authMiddleware, optionalAuthMiddleware } from '../lib/auth'
import { logger } from '../lib/logger'
import { z } from 'zod'
import multer, { type FileFilterCallback } from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import exifr from 'exifr'
import { spawn } from 'child_process'
import { analyzeCaseWithChatGPT, CaseAnalysisRequest } from '../services/chatgpt'
import { runCaseRecalculation } from '../lib/case-recalculation'
import { getClientConsentCompliance, isGuestCaseUserEmail } from '../lib/client-consent-guard'
import { ENV } from '../env'
import { prisma } from '../lib/prisma'

const router = Router()

async function resolveUploadUserId(userId: string | null, assessmentId?: string) {
  if (userId) return userId
  if (!assessmentId) return null

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { userId: true }
  })
  if (!assessment) return null
  if (assessment.userId) return assessment.userId

  const email = `guest+${assessmentId}@caseiq.local`
  const existing = await prisma.user.findUnique({ where: { email } })
  const guestUser = existing || await prisma.user.create({
    data: {
      email,
      firstName: 'Guest',
      lastName: 'User',
      isActive: true,
      emailVerified: false
    }
  })

  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { userId: guestUser.id }
  })

  return guestUser.id
}

export async function runAnalysisForAssessment(assessmentId: string) {
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { evidenceFiles: true }
    })

    if (!assessment) return

    const facts = JSON.parse(assessment.facts)
    const evidenceData = (assessment.evidenceFiles || []).map((file: any) => ({
      id: file.id,
      filename: file.filename,
      category: file.category,
      processed: file.processed,
      extractedData: file.extractedData ? JSON.parse(file.extractedData) : null
    }))

    const analysisRequest: CaseAnalysisRequest = {
      assessmentId: assessment.id,
      caseData: {
        ...facts,
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
  } catch (error: any) {
    logger.error('Failed to generate ChatGPT analysis after evidence upload', {
      error: error.message,
      assessmentId
    })
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'evidence')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb: FileFilterCallback) => {
    // Allow images, PDFs, and common document types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(null, false)
    }
  }
})

// Extract EXIF data from images
async function extractEXIFData(filePath: string): Promise<any> {
  try {
    if (filePath.toLowerCase().match(/\.(jpg|jpeg|png|tiff|tif)$/)) {
      const exifData = await exifr.parse(filePath)
      return exifData
    }
    return null
  } catch (error: any) {
    logger.error('Failed to extract EXIF data', { error, filePath })
    return null
  }
}

// Process image for thumbnails and optimization
async function processImage(filePath: string, filename: string): Promise<string> {
  try {
    const thumbnailPath = filePath.replace(/\.[^/.]+$/, '_thumb.jpg')
    const optimizedPath = filePath.replace(/\.[^/.]+$/, '_optimized.jpg')
    
    // Create thumbnail
    await sharp(filePath)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath)
    
    // Create optimized version
    await sharp(filePath)
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(optimizedPath)
    
    return thumbnailPath
  } catch (error) {
    logger.error('Failed to process image', { error, filePath })
    return filePath
  }
}

// OCR processing using Tesseract - with error handling
async function performOCR(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const tesseract = spawn('tesseract', [filePath, 'stdout', '-l', 'eng'])
      let output = ''
      
      tesseract.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      tesseract.stderr.on('data', (data) => {
        logger.warn('Tesseract stderr', { error: data.toString() })
      })
      
      tesseract.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim())
        } else {
          logger.warn(`Tesseract exited with code ${code}, returning empty OCR result`)
          resolve('') // Don't fail, just return empty string
        }
      })
      
      tesseract.on('error', (error) => {
        logger.warn('Tesseract not available or failed', { error: error.message })
        resolve('') // Don't fail, just return empty string
      })
    } catch (error: any) {
      logger.warn('OCR processing failed, returning empty result', { error: error.message })
      resolve('') // Don't fail, just return empty string
    }
  })
}

// NLP processing for extracted text
async function processExtractedData(ocrText: string): Promise<any> {
  try {
    // Extract monetary amounts
    const moneyRegex = /\$[\d,]+\.?\d*/g
    const dollarAmounts = ocrText.match(moneyRegex) || []
    
    // Extract dates
    const dateRegex = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/g
    const dates = ocrText.match(dateRegex) || []
    
    // Extract ICD codes (basic pattern)
    const icdRegex = /\b[A-Z]\d{2}(?:\.\d+)?\b/g
    const icdCodes = ocrText.match(icdRegex) || []
    
    // Extract CPT codes (basic pattern)
    const cptRegex = /\b\d{5}(?:\.\d+)?\b/g
    const cptCodes = ocrText.match(cptRegex) || []
    
    // Calculate total amount
    const totalAmount = dollarAmounts.reduce((sum, amount) => {
      const num = parseFloat(amount.replace(/[$,]/g, ''))
      return sum + (isNaN(num) ? 0 : num)
    }, 0)
    
    return {
      dollarAmounts,
      totalAmount,
      dates,
      icdCodes,
      cptCodes,
      confidence: 0.8, // Placeholder confidence score
      keywords: ocrText.toLowerCase().split(/\s+/).filter(word => 
        word.length > 3 && !['the', 'and', 'for', 'with', 'this', 'that'].includes(word)
      ).slice(0, 20)
    }
  } catch (error) {
    logger.error('Failed to process extracted data', { error })
    return {}
  }
}

function determineDataType(category: string, mimetype: string) {
  if (mimetype.startsWith('image/') || mimetype.startsWith('video/')) {
    return 'unstructured'
  }
  if (['medical_records', 'police_report', 'bills'].includes(category)) {
    return 'structured'
  }
  return 'unstructured'
}

function classifyEvidence(filename: string, category: string, ocrText: string) {
  const haystack = `${filename} ${category} ${ocrText}`.toLowerCase()
  if (haystack.includes('police') || haystack.includes('incident report')) return 'police_report'
  if (haystack.includes('invoice') || haystack.includes('bill') || haystack.includes('statement')) return 'bills'
  if (haystack.includes('mri') || haystack.includes('x-ray') || haystack.includes('diagnosis')) return 'medical_records'
  if (haystack.includes('photo') || haystack.includes('image')) return 'photos'
  if (haystack.includes('email') || haystack.includes('correspondence')) return 'correspondence'
  return category || 'other'
}

function summarizeText(ocrText: string) {
  const text = ocrText.replace(/\s+/g, ' ').trim()
  if (!text) return ''
  const sentences = text.split(/[.!?]\s+/).filter(Boolean)
  return sentences.slice(0, 2).join('. ').slice(0, 500)
}

function buildHighlights(extractedData: any, ocrText: string) {
  const highlights: string[] = []
  if (extractedData?.dollarAmounts?.length) {
    highlights.push(`Amounts: ${(extractedData.dollarAmounts as string[]).slice(0, 3).join(', ')}`)
  }
  if (extractedData?.dates?.length) {
    highlights.push(`Dates: ${(extractedData.dates as string[]).slice(0, 3).join(', ')}`)
  }
  if (extractedData?.icdCodes?.length) {
    highlights.push(`ICD: ${(extractedData.icdCodes as string[]).slice(0, 3).join(', ')}`)
  }
  if (extractedData?.cptCodes?.length) {
    highlights.push(`CPT: ${(extractedData.cptCodes as string[]).slice(0, 3).join(', ')}`)
  }
  if (!highlights.length && ocrText) {
    highlights.push(ocrText.split(/\s+/).slice(0, 15).join(' '))
  }
  return highlights
}

// Test upload endpoint (no auth required)
router.post('/test-upload', upload.single('file'), async (req: any, res) => {
  try {
    logger.info('Test upload request received', { 
      hasFile: !!req.file, 
      fileSize: req.file?.size,
      mimetype: req.file?.mimetype
    })

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    res.status(200).json({ 
      message: 'Test upload successful',
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    })
  } catch (error: any) {
    logger.error('Test upload failed', { error: error.message })
    res.status(500).json({ error: 'Test upload failed', details: error.message })
  }
})

// Simple test endpoint (no file processing)
router.post('/simple-test', upload.single('file'), async (req: any, res) => {
  try {
    logger.info('Simple test upload request received', { 
      hasFile: !!req.file, 
      fileSize: req.file?.size,
      mimetype: req.file?.mimetype,
      body: req.body
    })

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Just return success without any processing
    res.status(200).json({ 
      success: true,
      message: 'Simple test upload successful',
      received: {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        assessmentId: req.body.assessmentId,
        category: req.body.category
      }
    })
  } catch (error: any) {
    logger.error('Simple test upload failed', { error: error.message, stack: error.stack })
    res.status(500).json({ error: 'Simple test upload failed', details: error.message })
  }
})

// Upload evidence file - temporarily disable auth for testing
router.post('/upload', upload.single('file'), async (req: any, res) => {
  try {
    logger.info('Upload request received', { 
      hasFile: !!req.file, 
      fileSize: req.file?.size,
      mimetype: req.file?.mimetype,
      userId: req.user?.id 
    })

    if (!req.file) {
      logger.warn('No file uploaded')
      return res.status(400).json({ error: 'No file uploaded' })
    }

    let userId = req.user?.id || null
    const {
      assessmentId,
      category,
      subcategory,
      description,
      uploadMethod,
      captureDate,
      location,
      provenanceSource,
      provenanceNotes,
      provenanceActor,
      provenanceDate,
      tags,
      relevanceScore
    } = req.body

    userId = await resolveUploadUserId(userId, assessmentId)

    if (!userId) {
      return res.status(400).json({ error: 'Missing user. Please sign in or attach to an assessment.' })
    }

    const uploadUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerified: true },
    })
    if (uploadUser && !isGuestCaseUserEmail(uploadUser.email)) {
      const { ok, missing, outdated } = await getClientConsentCompliance(userId)
      if (!ok) {
        return res.status(403).json({
          error: 'Required legal consents must be accepted for the current document versions.',
          code: 'REQUIRED_CONSENTS_INCOMPLETE',
          missingConsents: [...new Set([...missing, ...outdated])],
        })
      }
      if (ENV.REQUIRE_EMAIL_VERIFICATION && !uploadUser.emailVerified) {
        return res.status(403).json({
          error: 'Please verify your email address to upload evidence.',
          code: 'EMAIL_VERIFICATION_REQUIRED',
        })
      }
    }

    logger.info('Processing file', { 
      userId,
      assessmentId, 
      category, 
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path
    })

    // Extract EXIF data for images
    let exifData = null
    try {
      exifData = await extractEXIFData(req.file.path)
    } catch (exifError) {
      logger.warn('Failed to extract EXIF data', { error: exifError })
    }
    
    // Process images (create thumbnails, optimize)
    let thumbnailPath = req.file.path
    if (req.file.mimetype.startsWith('image/')) {
      try {
        thumbnailPath = await processImage(req.file.path, req.file.filename)
      } catch (imageError) {
        logger.warn('Failed to process image', { error: imageError })
        // Continue without thumbnail
      }
    }

    const dataType = determineDataType(category || 'other', req.file.mimetype)
    const normalizedTags = typeof tags === 'string' && tags.length
      ? tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : Array.isArray(tags)
        ? tags
        : []

    // Create evidence file record
    const evidenceFile = await prisma.evidenceFile.create({
      data: {
        userId,
        assessmentId: assessmentId || null,
        originalName: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        filePath: req.file.path,
        fileUrl: `/uploads/evidence/${req.file.filename}`,
        category: category || 'other',
        subcategory: subcategory || null,
        description: description || null,
        dataType,
        tags: normalizedTags.length ? JSON.stringify(normalizedTags) : null,
        relevanceScore: relevanceScore ? Number(relevanceScore) : 0,
        uploadMethod: uploadMethod || 'drag_drop',
        captureDate: captureDate ? new Date(captureDate) : null,
        location: location || null,
        exifData: exifData ? JSON.stringify(exifData) : null,
        processingStatus: 'pending',
        isHIPAA: category === 'medical_records',
        accessLevel: 'private',
        provenanceSource: provenanceSource || null,
        provenanceNotes: provenanceNotes || null,
        provenanceActor: provenanceActor || null,
        provenanceDate: provenanceDate ? new Date(provenanceDate) : null
      }
    })

    // Queue processing job
    await prisma.evidenceProcessingJob.create({
      data: {
        evidenceFileId: evidenceFile.id,
        jobType: 'full_processing',
        status: 'queued',
        priority: 5
      }
    })

    // Log access
    await prisma.evidenceAccessLog.create({
      data: {
        evidenceFileId: evidenceFile.id,
        accessedBy: userId,
        accessType: 'upload',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        purpose: 'File upload'
      }
    })

    logger.info('File uploaded successfully', { 
      evidenceFileId: evidenceFile.id, 
      originalName: evidenceFile.originalName,
      userId 
    })
    if (assessmentId) {
      void runAnalysisForAssessment(assessmentId)
    }
    res.status(201).json(evidenceFile)
  } catch (error: any) {
    logger.error('Failed to upload evidence file', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id,
      filename: req.file?.originalname 
    })
    res.status(500).json({ 
      error: 'Failed to upload evidence file',
      details: error.message 
    })
  }
})

// Upload multiple files
router.post('/upload-multiple', optionalAuthMiddleware, upload.array('files', 10), async (req: any, res) => {
  try {
    const files = req.files as Express.Multer.File[]
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' })
    }

    let userId = req.user?.id || null
    const { assessmentId, category, subcategory, description, tags, relevanceScore, provenanceSource, provenanceNotes, provenanceActor, provenanceDate } = req.body
    userId = await resolveUploadUserId(userId, assessmentId)
    if (!userId) {
      return res.status(400).json({ error: 'Missing user. Please sign in or attach to an assessment.' })
    }

    const multiUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailVerified: true },
    })
    if (multiUser && !isGuestCaseUserEmail(multiUser.email)) {
      const { ok, missing, outdated } = await getClientConsentCompliance(userId)
      if (!ok) {
        return res.status(403).json({
          error: 'Required legal consents must be accepted for the current document versions.',
          code: 'REQUIRED_CONSENTS_INCOMPLETE',
          missingConsents: [...new Set([...missing, ...outdated])],
        })
      }
      if (ENV.REQUIRE_EMAIL_VERIFICATION && !multiUser.emailVerified) {
        return res.status(403).json({
          error: 'Please verify your email address to upload evidence.',
          code: 'EMAIL_VERIFICATION_REQUIRED',
        })
      }
    }

    const results = []

    for (const file of files) {
      try {
        // Extract EXIF data
        const exifData = await extractEXIFData(file.path)
        
        // Process images
        let thumbnailPath = file.path
        if (file.mimetype.startsWith('image/')) {
          thumbnailPath = await processImage(file.path, file.filename)
        }

        const dataType = determineDataType(category || 'other', file.mimetype)
        const normalizedTags = typeof tags === 'string' && tags.length
          ? tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : Array.isArray(tags)
            ? tags
            : []

        // Create evidence file record
        const evidenceFile = await prisma.evidenceFile.create({
          data: {
            userId,
            assessmentId: assessmentId || null,
            originalName: file.originalname,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
            filePath: file.path,
            fileUrl: `/uploads/evidence/${file.filename}`,
            category: category || 'other',
            subcategory: subcategory || null,
            description: description || null,
            dataType,
            tags: normalizedTags.length ? JSON.stringify(normalizedTags) : null,
            relevanceScore: relevanceScore ? Number(relevanceScore) : 0,
            uploadMethod: 'drag_drop',
            exifData: exifData ? JSON.stringify(exifData) : null,
            processingStatus: 'pending',
            isHIPAA: category === 'medical_records',
            accessLevel: 'private',
            provenanceSource: provenanceSource || null,
            provenanceNotes: provenanceNotes || null,
            provenanceActor: provenanceActor || null,
            provenanceDate: provenanceDate ? new Date(provenanceDate) : null
          }
        })

        // Queue processing job
        await prisma.evidenceProcessingJob.create({
          data: {
            evidenceFileId: evidenceFile.id,
            jobType: 'full_processing',
            status: 'queued',
            priority: 5
          }
        })

        results.push(evidenceFile)
      } catch (fileError) {
        logger.error('Failed to process file in batch upload', { error: fileError, filename: file.originalname })
        results.push({ error: `Failed to process ${file.originalname}` })
      }
    }

    if (assessmentId) {
      void runAnalysisForAssessment(assessmentId)
      void runCaseRecalculation(assessmentId, 'document_upload')
    }
    res.status(201).json({ files: results, count: results.length })
  } catch (error) {
    logger.error('Failed to upload multiple evidence files', { error })
    res.status(500).json({ error: 'Failed to upload evidence files' })
  }
})

// Get evidence files for user/assessment
router.get('/', optionalAuthMiddleware, async (req: any, res) => {
  try {
    const { assessmentId, category, processingStatus, query } = req.query

    const where: any = {}
    if (req.user?.id) {
      if (assessmentId) {
        // When fetching by assessment: include files for this assessment if it belongs to the user.
        // Files may have been uploaded by a guest user before account creation, so we fetch by
        // assessmentId and verify the assessment belongs to the current user.
        const assessment = await prisma.assessment.findUnique({
          where: { id: String(assessmentId) },
          select: { userId: true }
        })
        if (assessment?.userId === req.user.id) {
          where.assessmentId = assessmentId
          // Include files regardless of file's userId (handles guest-uploaded files)
        } else {
          where.userId = req.user.id
          where.assessmentId = assessmentId
        }
      } else {
        where.userId = req.user.id
      }
    } else if (assessmentId) {
      where.assessmentId = assessmentId
    } else {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (category) where.category = category
    if (processingStatus) where.processingStatus = processingStatus
    if (query) {
      where.OR = [
        { originalName: { contains: String(query), mode: 'insensitive' } },
        { description: { contains: String(query), mode: 'insensitive' } },
        { ocrText: { contains: String(query), mode: 'insensitive' } },
        { aiSummary: { contains: String(query), mode: 'insensitive' } }
      ]
    }

    const evidenceFiles = await prisma.evidenceFile.findMany({
      where,
      include: {
        extractedData: true,
        processingJobs: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        annotations: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json(evidenceFiles)
  } catch (error) {
    logger.error('Failed to fetch evidence files', { error })
    res.status(500).json({ error: 'Failed to fetch evidence files' })
  }
})

// Get single evidence file
router.get('/:fileId', authMiddleware, async (req: any, res) => {
  try {
    const { fileId } = req.params
    const userId = req.user.id

    const evidenceFile = await prisma.evidenceFile.findFirst({
      where: { id: fileId, userId },
      include: {
        extractedData: true,
        processingJobs: true,
        accessLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        annotations: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    })

    if (!evidenceFile) {
      return res.status(404).json({ error: 'Evidence file not found' })
    }

    // Log access
    await prisma.evidenceAccessLog.create({
      data: {
        evidenceFileId: fileId,
        accessedBy: userId,
        accessType: 'view',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        purpose: 'View evidence file'
      }
    })

    res.json(evidenceFile)
  } catch (error) {
    logger.error('Failed to fetch evidence file', { error })
    res.status(500).json({ error: 'Failed to fetch evidence file' })
  }
})

// Process evidence file (OCR, NLP)
router.post('/:fileId/process', authMiddleware, async (req: any, res) => {
  try {
    const { fileId } = req.params
    const userId = req.user.id

    const evidenceFile = await prisma.evidenceFile.findFirst({
      where: { id: fileId, userId }
    })

    if (!evidenceFile) {
      return res.status(404).json({ error: 'Evidence file not found' })
    }

    // Update processing status
    await prisma.evidenceFile.update({
      where: { id: fileId },
      data: { processingStatus: 'processing' }
    })

    try {
      let ocrText = ''
      
      // Perform OCR if it's an image or PDF (can be disabled via environment variable)
      try {
        const enableOCR = process.env.ENABLE_OCR === 'true' // Default to false to prevent crashes, set to 'true' to enable
        if (
          enableOCR &&
          !evidenceFile.mimetype.startsWith('video/') &&
          (evidenceFile.mimetype.startsWith('image/') || evidenceFile.mimetype === 'application/pdf')
        ) {
          logger.info('Starting OCR processing for file:', evidenceFile.originalName)
          ocrText = await performOCR(evidenceFile.filePath)
          logger.info('OCR processing completed for file:', evidenceFile.originalName)
        } else if (!enableOCR) {
          logger.info('OCR processing disabled via ENABLE_OCR environment variable')
        }
      } catch (ocrError: any) {
        logger.warn('OCR processing failed, continuing without OCR', { 
          error: ocrError.message, 
          file: evidenceFile.originalName 
        })
        ocrText = '' // Continue without OCR
      }

      // Process extracted data
      const extractedData = await processExtractedData(ocrText)
      const aiClassification = classifyEvidence(evidenceFile.originalName, evidenceFile.category, ocrText)
      const aiSummary = summarizeText(ocrText)
      const aiHighlights = buildHighlights(extractedData, ocrText)

      // Update file with OCR text (extractedData stored in ExtractedData model below)
      await prisma.evidenceFile.update({
        where: { id: fileId },
        data: {
          ocrText,
          processingStatus: 'completed',
          aiClassification,
          aiSummary,
          aiHighlights: aiHighlights.length ? JSON.stringify(aiHighlights) : null
        }
      })

      // Create extracted data record
      if (Object.keys(extractedData).length > 0) {
        await prisma.extractedData.create({
          data: {
            evidenceFileId: fileId,
            icdCodes: extractedData.icdCodes ? JSON.stringify(extractedData.icdCodes) : null,
            cptCodes: extractedData.cptCodes ? JSON.stringify(extractedData.cptCodes) : null,
            dollarAmounts: extractedData.dollarAmounts ? JSON.stringify(extractedData.dollarAmounts) : null,
            totalAmount: extractedData.totalAmount,
            dates: extractedData.dates ? JSON.stringify(extractedData.dates) : null,
            keywords: extractedData.keywords ? JSON.stringify(extractedData.keywords) : null,
            confidence: extractedData.confidence
          }
        })
      }

      if (evidenceFile.assessmentId) {
        void runCaseRecalculation(evidenceFile.assessmentId, 'evidence_processing')
      }

      res.json({ message: 'Processing completed', extractedData })
    } catch (processingError) {
      // Update status to failed
      await prisma.evidenceFile.update({
        where: { id: fileId },
        data: { processingStatus: 'failed' }
      })
      
      logger.error('Failed to process evidence file', { error: processingError })
      res.status(500).json({ error: 'Processing failed' })
    }
  } catch (error) {
    logger.error('Failed to process evidence file', { error })
    res.status(500).json({ error: 'Failed to process evidence file' })
  }
})

// Update evidence file metadata
const UpdateEvidenceFileSchema = z.object({
  category: z.string().optional(),
  subcategory: z.string().optional(),
  description: z.string().optional(),
  accessLevel: z.enum(['private', 'attorney', 'shared']).optional(),
  isVerified: z.boolean().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  relevanceScore: z.number().optional(),
  provenanceSource: z.string().optional(),
  provenanceNotes: z.string().optional(),
  provenanceActor: z.string().optional(),
  provenanceDate: z.string().optional()
})

router.put('/:fileId', authMiddleware, async (req: any, res) => {
  try {
    const { fileId } = req.params
    const userId = req.user.id
    const validatedData = UpdateEvidenceFileSchema.parse(req.body)
    const normalizedTags = typeof validatedData.tags === 'string'
      ? validatedData.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : Array.isArray(validatedData.tags)
        ? validatedData.tags
        : []

    const evidenceFile = await prisma.evidenceFile.findFirst({
      where: { id: fileId, userId }
    })

    if (!evidenceFile) {
      return res.status(404).json({ error: 'Evidence file not found' })
    }

    const updatedFile = await prisma.evidenceFile.update({
      where: { id: fileId },
      data: {
        ...validatedData,
        tags: normalizedTags.length ? JSON.stringify(normalizedTags) : validatedData.tags === undefined ? undefined : null,
        provenanceDate: validatedData.provenanceDate ? new Date(validatedData.provenanceDate) : undefined
      }
    })

    await prisma.evidenceAccessLog.create({
      data: {
        evidenceFileId: fileId,
        accessedBy: userId,
        accessType: 'update',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        purpose: 'Update evidence metadata'
      }
    })

    res.json(updatedFile)
  } catch (error) {
    logger.error('Failed to update evidence file', { error })
    res.status(500).json({ error: 'Failed to update evidence file' })
  }
})

// Delete evidence file
router.delete('/:fileId', authMiddleware, async (req: any, res) => {
  try {
    const { fileId } = req.params
    const userId = req.user.id

    const evidenceFile = await prisma.evidenceFile.findFirst({
      where: { id: fileId, userId }
    })

    if (!evidenceFile) {
      return res.status(404).json({ error: 'Evidence file not found' })
    }

    // Delete physical file
    try {
      if (fs.existsSync(evidenceFile.filePath)) {
        fs.unlinkSync(evidenceFile.filePath)
      }
    } catch (fileError) {
      logger.error('Failed to delete physical file', { error: fileError, filePath: evidenceFile.filePath })
    }

    // Delete database record (cascade will handle related records)
    await prisma.evidenceFile.delete({
      where: { id: fileId }
    })

    res.json({ message: 'Evidence file deleted successfully' })
  } catch (error) {
    logger.error('Failed to delete evidence file', { error })
    res.status(500).json({ error: 'Failed to delete evidence file' })
  }
})

const EvidenceAnnotationSchema = z.object({
  content: z.string().min(1),
  anchor: z.string().optional(),
  pageNumber: z.number().optional()
})

router.get('/:fileId/annotations', authMiddleware, async (req: any, res) => {
  try {
    const { fileId } = req.params
    const userId = req.user.id

    const evidenceFile = await prisma.evidenceFile.findFirst({
      where: { id: fileId, userId }
    })

    if (!evidenceFile) {
      return res.status(404).json({ error: 'Evidence file not found' })
    }

    const annotations = await prisma.evidenceAnnotation.findMany({
      where: { evidenceFileId: fileId },
      orderBy: { createdAt: 'desc' }
    })

    res.json(annotations)
  } catch (error) {
    logger.error('Failed to fetch evidence annotations', { error })
    res.status(500).json({ error: 'Failed to fetch annotations' })
  }
})

router.post('/:fileId/annotations', authMiddleware, async (req: any, res) => {
  try {
    const { fileId } = req.params
    const userId = req.user.id
    const payload = EvidenceAnnotationSchema.parse(req.body || {})

    const evidenceFile = await prisma.evidenceFile.findFirst({
      where: { id: fileId, userId }
    })

    if (!evidenceFile) {
      return res.status(404).json({ error: 'Evidence file not found' })
    }

    const annotation = await prisma.evidenceAnnotation.create({
      data: {
        evidenceFileId: fileId,
        authorId: userId,
        content: payload.content,
        anchor: payload.anchor || null,
        pageNumber: payload.pageNumber ?? null
      }
    })

    await prisma.evidenceAccessLog.create({
      data: {
        evidenceFileId: fileId,
        accessedBy: userId,
        accessType: 'annotate',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        purpose: 'Add annotation'
      }
    })

    res.status(201).json(annotation)
  } catch (error) {
    logger.error('Failed to create evidence annotation', { error })
    res.status(500).json({ error: 'Failed to create annotation' })
  }
})

// Get processing jobs
router.get('/:fileId/jobs', authMiddleware, async (req: any, res) => {
  try {
    const { fileId } = req.params
    const userId = req.user.id

    const evidenceFile = await prisma.evidenceFile.findFirst({
      where: { id: fileId, userId }
    })

    if (!evidenceFile) {
      return res.status(404).json({ error: 'Evidence file not found' })
    }

    const jobs = await prisma.evidenceProcessingJob.findMany({
      where: { evidenceFileId: fileId },
      orderBy: { createdAt: 'desc' }
    })

    res.json(jobs)
  } catch (error) {
    logger.error('Failed to fetch processing jobs', { error })
    res.status(500).json({ error: 'Failed to fetch processing jobs' })
  }
})

router.get('/insights/summary', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.id
    const { assessmentId } = req.query as { assessmentId?: string }

    const where: any = { userId }
    if (assessmentId) where.assessmentId = assessmentId

    const evidenceFiles = await prisma.evidenceFile.findMany({
      where,
      include: { extractedData: true }
    })

    if (!assessmentId) {
      const byCategory = evidenceFiles.reduce((acc: Record<string, number>, file) => {
        acc[file.category] = (acc[file.category] || 0) + 1
        return acc
      }, {})
      return res.json({
        scope: 'all',
        totalFiles: evidenceFiles.length,
        byCategory
      })
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { evidenceFiles: true }
    })

    const facts = assessment?.facts ? JSON.parse(assessment.facts) : {}
    const incidentDate = facts?.incident?.date ? new Date(facts.incident.date) : null
    const categoriesPresent = new Set(evidenceFiles.map(file => file.category))
    const gaps = ['medical_records', 'police_report', 'photos', 'bills'].filter(cat => !categoriesPresent.has(cat))

    const extractedDates = evidenceFiles.flatMap(file => {
      const data = file.extractedData?.[0]
      if (!data?.dates) return []
      try {
        return JSON.parse(data.dates)
      } catch {
        return []
      }
    }).map((d: string) => new Date(d)).filter((d: Date) => !isNaN(d.getTime()))

    const contradictions: string[] = []
    if (incidentDate && extractedDates.length) {
      const earliest = extractedDates.sort((a, b) => a.getTime() - b.getTime())[0]
      const latest = extractedDates.sort((a, b) => b.getTime() - a.getTime())[0]
      if (earliest.getTime() < incidentDate.getTime() - 30 * 24 * 60 * 60 * 1000) {
        contradictions.push('Evidence dates precede reported incident date')
      }
      if (latest.getTime() > incidentDate.getTime() + 365 * 24 * 60 * 60 * 1000) {
        contradictions.push('Evidence dates extend far beyond incident date')
      }
    }

    const totalAmount = evidenceFiles.reduce((sum, file) => {
      const data = file.extractedData?.[0]
      return sum + (data?.totalAmount || 0)
    }, 0)
    const medicalCount = evidenceFiles.filter(file => file.category === 'medical_records').length
    const policeCount = evidenceFiles.filter(file => file.category === 'police_report').length
    const severityScore = Math.min(1, (medicalCount / 3) + (totalAmount / 100000))
    const liabilityScore = Math.min(1, policeCount / 2 + (categoriesPresent.has('photos') ? 0.2 : 0))

    const chronology = extractedDates
      .sort((a, b) => a.getTime() - b.getTime())
      .slice(0, 20)
      .map(date => date.toISOString().split('T')[0])

    res.json({
      scope: 'assessment',
      gaps,
      contradictions,
      severitySignals: {
        score: Number(severityScore.toFixed(2)),
        drivers: [
          `${medicalCount} medical records`,
          `$${Math.round(totalAmount).toLocaleString()} extracted amount`
        ]
      },
      liabilitySignals: {
        score: Number(liabilityScore.toFixed(2)),
        drivers: [
          `${policeCount} police reports`,
          categoriesPresent.has('photos') ? 'Photos available' : 'No photos'
        ]
      },
      medicalChronology: chronology
    })
  } catch (error) {
    logger.error('Failed to generate evidence insights', { error })
    res.status(500).json({ error: 'Failed to generate evidence insights' })
  }
})

export default router
