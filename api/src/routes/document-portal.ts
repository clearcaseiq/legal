import { Router } from 'express'
import multer, { type FileFilterCallback } from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { replicateUploads } from '../lib/object-storage'
import { isAcceptedUpload, SPREADSHEET_EXTENSIONS, SPREADSHEET_MIMETYPES } from '../lib/upload-filter'
import { ensureCaseOwnerUserId } from '../lib/case-owner'
import { fanOutCaseUpdates, fileClaimantEvidence, MAX_EVIDENCE_BYTES } from '../lib/evidence-intake'
import {
  acceptedCategoriesForRequestKey,
  DOCUMENT_REQUEST_LABELS,
  evidenceCategoryForRequestKey,
  parseRequestedDocs,
} from '../lib/document-request-status'

const router = Router()

// Labels mirror OPPOSING_DOC_LABELS in attorney-dashboard so the portal can render
// human-readable document names to the external recipient.
const OPPOSING_DOC_LABELS: Record<string, string> = {
  medical_records: 'Medical records',
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
    // Spreadsheets on top of the shared document set: carriers send ledgers as
    // .xlsx, and this portal is how they reach us.
    const accepted = isAcceptedUpload(file, {
      mimetypes: SPREADSHEET_MIMETYPES,
      extensions: SPREADSHEET_EXTENSIONS,
    })
    if (!accepted) {
      // multer signals rejection by leaving req.file undefined, which reads as
      // "no file" downstream. Without this the portal drops uploads silently.
      logger.warn('Document portal upload rejected by file filter', {
        originalname: file.originalname,
        mimetype: file.mimetype,
      })
    }
    cb(null, accepted)
  },
})

/**
 * Claimant uploads are held in memory, never staged on disk.
 *
 * The disk-backed `upload` above writes into `external-documents`, and
 * `replicateUploads` then mirrors whatever it wrote to object storage. Sending a
 * claimant's medical records down that path would leave a second copy of PHI
 * under the opposing-party prefix that nothing references and nothing deletes
 * when the evidence is deleted. `fileClaimantEvidence` wants the bytes anyway,
 * so there is nothing to stage.
 */
const claimantUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_EVIDENCE_BYTES },
  fileFilter: (_req, file, cb: FileFilterCallback) => {
    const accepted = isAcceptedUpload(file)
    if (!accepted) {
      logger.warn('Claimant portal upload rejected by file filter', { mimetype: file.mimetype })
    }
    cb(null, accepted)
  },
})

/**
 * Choose the parser and the durability step from the token, before any body is
 * read. Branching later is not possible: multer has already written the file by
 * the time a handler could look at the request it belongs to.
 */
function forClaimant(req: any): boolean {
  return req.docRequest?.targetType === 'plaintiff'
}

async function attachRequest(req: any, _res: any, next: any) {
  try {
    req.docRequest = await loadRequest(req.params.token)
  } catch (error: any) {
    logger.error('Failed to load document request for portal upload', { error: error.message })
  }
  next()
}

async function loadRequest(token: string) {
  return prisma.documentRequest.findUnique({
    where: { secureToken: token },
    include: {
      externalUploads: { orderBy: { createdAt: 'desc' } },
      attorney: { select: { name: true, lawFirm: { select: { name: true } } } },
      lead: { select: { assessmentId: true } },
      documentEnvelope: {
        select: { id: true, title: true, status: true, signedAt: true, signedFilePath: true },
      },
    },
  })
}

async function loadOpposingRequest(token: string) {
  const docRequest = await loadRequest(token)
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

/**
 * What a claimant opening the texted link is allowed to see.
 *
 * Deliberately narrower than the case. The token travels by SMS to a phone that
 * may be shared, borrowed or lost, so this returns only what someone needs in
 * order to answer the ask — who wants the documents and which ones — plus the
 * files sent through this very request, so a claimant can tell whether their
 * upload landed. It never lists the case's other evidence, which would turn a
 * forwarded text into a window onto the whole file.
 */
async function claimantPortalPayload(docRequest: Awaited<ReturnType<typeof loadRequest>>) {
  if (!docRequest) return null
  const assessmentId = docRequest.lead?.assessmentId || null
  const uploads = assessmentId
    ? await prisma.evidenceFile.findMany({
        where: { assessmentId, provenanceSource: portalProvenance(docRequest.id) },
        select: { id: true, originalName: true, category: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      })
    : []

  // Whether an item is answered is decided here, not in the page. A claimant
  // answering `injury_photos` produces a file stored under `photos`, so a
  // client-side key comparison would leave every item looking outstanding no
  // matter how much they sent.
  const uploadedCategories = new Set(uploads.map((file) => (file.category || '').trim()))

  return {
    mode: 'claimant',
    attorneyName: docRequest.attorney?.name || null,
    firmName: docRequest.attorney?.lawFirm?.name || null,
    customMessage: docRequest.customMessage,
    status: docRequest.status,
    requestedDocs: parseRequestedDocs(docRequest.requestedDocs).map((key) => ({
      key,
      label: DOCUMENT_REQUEST_LABELS[key] || key,
      fulfilled: acceptedCategoriesForRequestKey(key).some((category) => uploadedCategories.has(category)),
    })),
    uploads: uploads.map((file) => ({
      id: file.id,
      originalName: file.originalName,
      docType: file.category,
      createdAt: file.createdAt,
    })),
  }
}

/** Ties evidence back to the request it answered, without a schema change. */
function portalProvenance(requestId: string): string {
  return `portal:${requestId}`
}

// Public: load the document request details for the tokenized portal (no auth).
router.get('/:token', async (req, res) => {
  try {
    const anyRequest = await loadRequest(req.params.token)
    if (!anyRequest) return res.status(404).json({ error: 'This document request was not found or has expired.' })
    if (anyRequest.targetType === 'plaintiff') {
      return res.json(await claimantPortalPayload(anyRequest))
    }

    const docRequest = await loadOpposingRequest(req.params.token)
    if (!docRequest) return res.status(404).json({ error: 'This document request was not found or has expired.' })

    const requestedDocs = parseDocs(docRequest.requestedDocs)
    const env = docRequest.documentEnvelope
    // Custodians legally require a signed authorization on file before releasing
    // records. Surface it (metadata + a download link) when one is linked.
    const authorization =
      env && env.status === 'signed'
        ? {
            title: env.title,
            signedAt: env.signedAt,
            available: Boolean(env.signedFilePath),
            downloadUrl: env.signedFilePath ? `/v1/public/document-requests/${req.params.token}/authorization` : null,
          }
        : null
    res.json({
      mode: 'opposing',
      recipientName: docRequest.recipientName,
      recipientRole: docRequest.recipientRole,
      attorneyName: docRequest.attorney?.name || null,
      firmName: docRequest.attorney?.lawFirm?.name || null,
      customMessage: docRequest.customMessage,
      status: docRequest.status,
      authorization,
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

// Public: the recipient uploads a file against the request (no auth, token-gated).
router.post(
  '/:token/upload',
  attachRequest,
  (req: any, res, next) =>
    forClaimant(req) ? claimantUpload.single('file')(req, res, next) : upload.single('file')(req, res, next),
  // Claimant bytes are still in memory and are persisted by the evidence filer.
  (req: any, res, next) => (forClaimant(req) ? next() : replicateUploads(req, res, next)),
  async (req: any, res) => {
  try {
    if (forClaimant(req)) return await handleClaimantUpload(req, res)

    const docRequest = await loadOpposingRequest(req.params.token)
    if (!docRequest) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
      return res.status(404).json({ error: 'This document request was not found or has expired.' })
    }
    if (!req.file) {
      return res.status(400).json({
        error:
          'No file received. If you selected a file, its format may be unsupported. Please use a JPG, PNG, HEIC, PDF, or common Office document (max 50MB).',
      })
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
  },
)

/**
 * File a claimant's upload as evidence on their case.
 *
 * The point of this branch is that the result is indistinguishable from the same
 * document uploaded while signed in: it becomes an `EvidenceFile`, gets queued
 * for OCR and extraction, and fans out to recalculation, the coach and document
 * request status. Anything less and the texted link would be a place documents
 * go to sit.
 */
async function handleClaimantUpload(req: any, res: any) {
  const docRequest = req.docRequest
  const assessmentId = docRequest?.lead?.assessmentId
  if (!assessmentId) {
    return res.status(404).json({ error: 'This document request was not found or has expired.' })
  }
  if (!req.file?.buffer?.length) {
    return res.status(400).json({
      error:
        'No file received. If you selected a file, its format may be unsupported. Please use a JPG, PNG, HEIC, PDF, or common Office document (max 50MB).',
    })
  }

  const ownerUserId = await ensureCaseOwnerUserId(assessmentId)
  if (!ownerUserId) {
    logger.error('Claimant portal upload has no case owner', { assessmentId })
    return res.status(500).json({ error: 'Failed to upload file' })
  }

  // Only trust a doc type the attorney actually asked for. The value arrives in
  // a public request body, and an arbitrary string here would file the document
  // under a category nothing reads.
  const requested = parseRequestedDocs(docRequest.requestedDocs)
  const claimed = typeof req.body?.docType === 'string' ? req.body.docType : ''
  const docType = requested.includes(claimed) ? claimed : null

  const result = await fileClaimantEvidence({
    assessmentId,
    ownerUserId,
    buffer: req.file.buffer,
    contentType: req.file.mimetype,
    originalName: req.file.originalname,
    // No doc type means nobody chose a category, so OCR classifies it later.
    category: docType ? evidenceCategoryForRequestKey(docType) : undefined,
    uploadMethod: 'upload_link',
    provenanceSource: portalProvenance(docRequest.id),
    provenanceActor: 'claimant',
    provenanceNotes: 'Uploaded through the document link sent by the case team.',
  })

  if (result.status === 'rejected') {
    return res.status(400).json({
      error:
        'We could not accept that file. Please use a JPG, PNG, HEIC, PDF, or common Office document (max 50MB).',
    })
  }
  if (result.status === 'duplicate') {
    // Not an error: people tap the link twice when they are unsure it worked.
    return res.json({ id: null, originalName: req.file.originalname, docType, duplicate: true })
  }

  // Status is recomputed from the evidence itself by the fan-out, which is the
  // same path a signed-in upload takes, so this route does not set it directly.
  fanOutCaseUpdates(assessmentId, [result.filed])

  return res.json({
    id: result.evidenceFileId,
    originalName: result.filed.originalName,
    docType: result.filed.category,
    duplicate: false,
  })
}

// Public: stream the executed HIPAA authorization to the custodian so they can
// verify the disclosure is permitted (token-gated, only when signed).
router.get('/:token/authorization', async (req, res) => {
  try {
    const docRequest = await loadOpposingRequest(req.params.token)
    const env = docRequest?.documentEnvelope
    if (!env || env.status !== 'signed' || !env.signedFilePath || !fs.existsSync(env.signedFilePath)) {
      return res.status(404).json({ error: 'No signed authorization is available for this request.' })
    }
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'inline; filename="hipaa-authorization.pdf"')
    fs.createReadStream(env.signedFilePath).pipe(res)
  } catch (error: any) {
    logger.error('Failed to serve authorization document', { error: error.message })
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
