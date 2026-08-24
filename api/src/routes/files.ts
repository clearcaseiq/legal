import { Router } from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import path from 'path'
import fs from 'fs'
import { authMiddleware, optionalAuthMiddleware, type AuthRequest } from '../lib/auth'
import { enforceAssessmentReadAccess } from '../lib/assessment-access'

/**
 * Legacy generic file store, kept for API compatibility (see
 * docs/FUNCTIONAL_SPECIFICATION.md). Claimant evidence goes through
 * `/v1/evidence`, which is where the real classification and OCR pipeline lives.
 *
 * Every route here was previously unauthenticated. `GET /assessment/:id` in
 * particular listed the documents attached to any case to any caller, which
 * paired with the anonymous assessment list to turn a case id into a document
 * inventory. Reads now go through the same `enforceAssessmentReadAccess` gate as
 * the rest of the case surface, and writes require a session.
 */
const router = Router()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads'
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
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDFs and common image formats
    const allowedTypes = /jpeg|jpg|png|gif|pdf/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    
    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only PDF and image files are allowed'))
    }
  }
})

// Upload file. Anonymous intake uploads go to `/v1/evidence`, which has its own
// guest handling, so this path requires a session.
router.post('/upload', authMiddleware, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const fileId = uuidv4()
    
    // Store file metadata in database
    const fileRecord = await prisma.file.create({
      data: {
        id: fileId,
        originalName: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        status: 'UPLOADED'
      }
    })

    logger.info('File uploaded', { 
      fileId, 
      originalName: req.file.originalname,
      size: req.file.size 
    })

    // The record stays UPLOADED. There is no OCR pipeline behind this legacy
    // endpoint, so nothing may write extractedText or flip the row to PROCESSED —
    // a consumer cannot distinguish placeholder text from a real extraction once
    // it is persisted. Real extraction runs in lib/evidence-processing.ts via
    // /v1/evidence.
    res.json({
      file_id: fileId,
      original_name: req.file.originalname,
      size: req.file.size,
      status: 'UPLOADED'
    })
  } catch (error) {
    logger.error('Failed to upload file', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get file status
router.get('/:fileId', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { fileId } = req.params
    
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    })
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    // A file with no assessment is an orphan from an aborted upload and belongs
    // to no case, so there is no owner to check it against — only an admin can
    // read one. Otherwise the case's access rules decide.
    if (!file.assessmentId) {
      if (req.user?.role !== 'admin') {
        return res.status(req.user ? 403 : 401).json({
          error: req.user ? 'Not authorized to view this file' : 'Authentication required',
        })
      }
    } else {
      const permitted = await enforceAssessmentReadAccess({
        assessmentId: file.assessmentId,
        user: req.user,
        res,
        route: 'GET /v1/files/:fileId',
      })
      if (!permitted) return
    }

    res.json({
      file_id: file.id,
      original_name: file.originalName,
      status: file.status,
      extracted_text: file.extractedText,
      summary: file.summary,
      uploaded_at: file.createdAt
    })
  } catch (error) {
    logger.error('Failed to get file', { error, fileId: req.params.fileId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// List files for an assessment
router.get('/assessment/:assessmentId', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { assessmentId } = req.params

    const permitted = await enforceAssessmentReadAccess({
      assessmentId,
      user: req.user,
      res,
      route: 'GET /v1/files/assessment/:assessmentId',
    })
    if (!permitted) return

    const files = await prisma.file.findMany({
      where: { assessmentId },
      orderBy: { createdAt: 'desc' }
    })

    res.json(files.map(f => ({
      file_id: f.id,
      original_name: f.originalName,
      status: f.status,
      summary: f.summary,
      uploaded_at: f.createdAt
    })))
  } catch (error) {
    logger.error('Failed to list files', { error, assessmentId: req.params.assessmentId })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
