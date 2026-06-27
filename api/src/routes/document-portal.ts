import { Router } from 'express'
import multer, { type FileFilterCallback } from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'

const router = Router()

// Labels mirror OPPOSING_DOC_LABELS in attorney-dashboard so the portal can render
// human-readable document names to the external recipient.
const OPPOSING_DOC_LABELS: Record<string, string> = {
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

const EXTERNAL_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'external-documents')

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(EXTERNAL_UPLOAD_DIR)) {
      fs.mkdirSync(EXTERNAL_UPLOAD_DIR, { recursive: true })
    }
    cb(null, EXTERNAL_UPLOAD_DIR)
  },
  filename: (_req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb: FileFilterCallback) => {
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
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]
    cb(null, allowedTypes.includes(file.mimetype))
  },
})

async function loadOpposingRequest(token: string) {
  const docRequest = await prisma.documentRequest.findUnique({
    where: { secureToken: token },
    include: {
      externalUploads: { orderBy: { createdAt: 'desc' } },
      attorney: { select: { name: true, lawFirm: { select: { name: true } } } },
    },
  })
  if (!docRequest || docRequest.targetType !== 'opposing_party') return null
  return docRequest
}

function parseDocs(raw: string | null): string[] {
  try {
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Recompute request status from the uploads collected so far.
function computeStatus(requestedDocs: string[], uploadedDocTypes: string[]): string {
  if (uploadedDocTypes.length === 0) return 'pending'
  if (requestedDocs.length === 0) return 'partial'
  const covered = requestedDocs.every((d) => uploadedDocTypes.includes(d))
  return covered ? 'completed' : 'partial'
}

// Public: load the document request details for the tokenized portal (no auth).
router.get('/:token', async (req, res) => {
  try {
    const docRequest = await loadOpposingRequest(req.params.token)
    if (!docRequest) return res.status(404).json({ error: 'This document request was not found or has expired.' })

    const requestedDocs = parseDocs(docRequest.requestedDocs)
    res.json({
      recipientName: docRequest.recipientName,
      recipientRole: docRequest.recipientRole,
      attorneyName: docRequest.attorney?.name || null,
      firmName: docRequest.attorney?.lawFirm?.name || null,
      customMessage: docRequest.customMessage,
      status: docRequest.status,
      requestedDocs: requestedDocs.map((d) => ({ key: d, label: OPPOSING_DOC_LABELS[d] || d })),
      uploads: docRequest.externalUploads.map((u) => ({
        id: u.id,
        originalName: u.originalName,
        docType: u.docType,
        createdAt: u.createdAt,
      })),
    })
  } catch (error: any) {
    logger.error('Failed to load document portal request', { error: error.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Public: external recipient uploads a file against the request (no auth, token-gated).
router.post('/:token/upload', upload.single('file'), async (req: any, res) => {
  try {
    const docRequest = await loadOpposingRequest(req.params.token)
    if (!docRequest) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
      return res.status(404).json({ error: 'This document request was not found or has expired.' })
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Allowed types: PDF, images, video, Office docs (max 50MB).' })
    }

    const docType = typeof req.body?.docType === 'string' && req.body.docType ? req.body.docType : null
    const uploadedByName = typeof req.body?.uploadedByName === 'string' ? req.body.uploadedByName.slice(0, 200) : null
    const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, 2000) : null

    const created = await prisma.externalDocumentUpload.create({
      data: {
        documentRequestId: docRequest.id,
        docType,
        originalName: req.file.originalname,
        storedName: req.file.filename,
        filePath: req.file.path,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        uploadedByName,
        note,
      },
    })

    const requestedDocs = parseDocs(docRequest.requestedDocs)
    const uploadedDocTypes = [
      ...docRequest.externalUploads.map((u) => u.docType).filter(Boolean),
      docType,
    ].filter(Boolean) as string[]
    const status = computeStatus(requestedDocs, uploadedDocTypes)
    if (status !== docRequest.status) {
      await prisma.documentRequest.update({ where: { id: docRequest.id }, data: { status } })
    }

    res.json({
      id: created.id,
      originalName: created.originalName,
      docType: created.docType,
      status,
    })
  } catch (error: any) {
    logger.error('Failed to accept document portal upload', { error: error.message })
    res.status(500).json({ error: 'Failed to upload file' })
  }
})

export default router
