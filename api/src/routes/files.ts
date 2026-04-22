import { Router } from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import path from 'path'
import fs from 'fs'

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

// Upload file
router.post('/upload', upload.single('file'), async (req, res) => {
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

    // TODO: Queue background job for OCR/processing
    // For now, just simulate processing completion
    setTimeout(async () => {
      await prisma.file.update({
        where: { id: fileId },
        data: {
          status: 'PROCESSED',
          extractedText: 'Sample extracted text from document...',
          summary: 'Medical records, police report, insurance correspondence'
        }
      })
    }, 2000)

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
router.get('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params
    
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    })
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' })
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
router.get('/assessment/:assessmentId', async (req, res) => {
  try {
    const { assessmentId } = req.params
    
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
