/**
 * Land a claimant-supplied file on a case as evidence.
 *
 * This is the shared tail of every ingress that is not a signed-in upload: a
 * photo texted to the ClearCaseIQ number, and a file dropped on the tokenised
 * portal an attorney texts when the SMS provider cannot receive media. Both
 * arrive the same way — bytes, a content type, and a case we already trust —
 * and both must end up indistinguishable from a document the claimant uploaded
 * while signed in, because everything downstream reads `EvidenceFile` and
 * nothing downstream asks how the bytes got here.
 *
 * Kept out of `routes/` on purpose: the sender has no session, so none of this
 * can lean on the request user the evidence route takes for granted.
 */
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from './prisma'
import { logger } from './logger'
import { isAcceptedUpload } from './upload-filter'
import { persistUpload } from './object-storage'
import { processEvidenceFileForExtraction, shouldAutoProcessEvidence } from './evidence-processing'
import { runCaseRecalculation } from './case-recalculation'
import { syncCaseCoachTasks } from './case-coach-loop'
import { syncPlaintiffDocumentRequestStatuses } from './document-request-status'
import { recordAssistanceDocumentSubmission } from './assistance-document-intake'

/** Matches the evidence upload route, so no ingress accepts what it would reject. */
export const MAX_EVIDENCE_BYTES = 50 * 1024 * 1024

export type FiledEvidence = { originalName: string; category: string }

export type FileEvidenceResult =
  | { status: 'filed'; evidenceFileId: string; filed: FiledEvidence }
  | { status: 'duplicate' }
  | { status: 'rejected' }

export type FileEvidenceParams = {
  assessmentId: string
  ownerUserId: string
  buffer: Buffer
  contentType: string
  originalName: string
  /**
   * Only pass a category when a person actually chose one. Anything left at
   * `other` is classified after OCR; a value invented here would look like a
   * choice and suppress that.
   */
  category?: string
  /** A `custom:` request key when the upload answers an attorney's custom item. */
  subcategory?: string
  uploadMethod: string
  provenanceSource: string
  provenanceActor: string
  provenanceNotes?: string
  provenanceDate?: Date
}

export function evidenceDir(): string {
  const dir = path.join(process.cwd(), 'uploads', 'evidence')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * Write one file onto a case and queue it for processing.
 *
 * Deduplicates on a SHA-256 of the bytes. Neither channel this serves has an
 * "already sent" state — a claimant unsure whether a photo went through sends
 * it again, and taps a texted link twice — so without the hash the same
 * treatment bill is counted twice in `facts.damages`.
 */
export async function fileClaimantEvidence(params: FileEvidenceParams): Promise<FileEvidenceResult> {
  const { assessmentId, ownerUserId, buffer, contentType, originalName } = params

  if (!buffer.length || buffer.length > MAX_EVIDENCE_BYTES) {
    logger.warn('Claimant evidence rejected on size', { assessmentId, bytes: buffer.length })
    return { status: 'rejected' }
  }

  if (!isAcceptedUpload({ mimetype: contentType, originalname: originalName })) {
    logger.info('Claimant evidence rejected by the upload filter', { assessmentId, contentType })
    return { status: 'rejected' }
  }

  const contentHash = crypto.createHash('sha256').update(buffer).digest('hex')
  const alreadyOnCase = await prisma.evidenceFile.findFirst({
    where: { assessmentId, contentHash },
    select: { id: true },
  })
  if (alreadyOnCase) return { status: 'duplicate' }

  const filename = `${uuidv4()}-${originalName}`
  const filePath = path.join(evidenceDir(), filename)
  await fs.promises.writeFile(filePath, buffer)
  await persistUpload(filePath, { optional: true })

  const evidenceFile = await prisma.evidenceFile.create({
    data: {
      userId: ownerUserId,
      assessmentId,
      originalName,
      filename,
      mimetype: contentType || 'application/octet-stream',
      size: buffer.length,
      filePath,
      fileUrl: `/uploads/evidence/${filename}`,
      category: params.category || 'other',
      subcategory: params.subcategory || null,
      dataType: 'unstructured',
      uploadMethod: params.uploadMethod,
      contentHash,
      processingStatus: 'pending',
      accessLevel: 'private',
      provenanceSource: params.provenanceSource,
      provenanceActor: params.provenanceActor,
      provenanceNotes: params.provenanceNotes,
      provenanceDate: params.provenanceDate || new Date(),
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

  if (shouldAutoProcessEvidence(evidenceFile.category, evidenceFile.mimetype)) {
    void processEvidenceFileForExtraction(evidenceFile.id).catch((error: any) => {
      logger.error('Processing a claimant-supplied document failed', {
        evidenceFileId: evidenceFile.id,
        error: error?.message,
      })
    })
  }

  return {
    status: 'filed',
    evidenceFileId: evidenceFile.id,
    filed: { originalName, category: evidenceFile.category },
  }
}

/**
 * The same chain `routes/evidence.ts` runs after an upload.
 *
 * Ordering is load-bearing: the coach is chained after recalculation so it sees
 * evidence already merged into facts.
 */
export function fanOutCaseUpdates(assessmentId: string, files: FiledEvidence[]): void {
  // Imported lazily: the analysis helper lives on the evidence route, and a
  // static import would make this library depend on a router.
  void import('../routes/evidence')
    .then(({ runAnalysisForAssessment }) => runAnalysisForAssessment(assessmentId))
    .catch((error: any) =>
      logger.warn('Analysis after claimant documents failed', { assessmentId, error: error?.message }),
    )

  void runCaseRecalculation(assessmentId, 'document_upload').finally(() => {
    void syncCaseCoachTasks(assessmentId, { trigger: 'document_upload' })
  })
  void syncPlaintiffDocumentRequestStatuses(assessmentId)
  // One timeline entry for the batch rather than one per file, so a claimant
  // sending six photos does not bury the rest of the case history.
  void recordAssistanceDocumentSubmission({ assessmentId, files })
}
