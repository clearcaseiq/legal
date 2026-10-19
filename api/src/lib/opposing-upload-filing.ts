import fs from 'fs'
import { prisma } from './prisma'
import { logger } from './logger'
import { ensureCaseOwnerUserId } from './case-owner'
import { fanOutCaseUpdates, fileClaimantEvidence } from './evidence-intake'
import { ensureLocalCopy } from './object-storage'

/**
 * Evidence categories for what the other side was asked for. Only types with an
 * unambiguous home are mapped; the rest stay `other` and are classified after OCR.
 */
const OPPOSING_DOC_CATEGORY: Record<string, string> = {
  medical_records: 'medical_records',
  medical_bills: 'bills',
  insurance_policy: 'dec_page',
  incident_report: 'police_report',
  surveillance: 'video',
  photos: 'photos',
  correspondence: 'correspondence',
  video_footage: 'video',
}

/**
 * Witnesses send phone video, which runs far past the 50MB document ceiling.
 * Only requests addressed to a witness get this limit.
 */
export const WITNESS_MAX_UPLOAD_BYTES = 500 * 1024 * 1024

export function maxUploadBytesForRole(recipientRole: string | null | undefined): number | undefined {
  return recipientRole === 'witness' ? WITNESS_MAX_UPLOAD_BYTES : undefined
}

export function opposingProvenance(requestId: string): string {
  return `opposing_portal:${requestId}`
}

type OpposingRequest = { id: string; recipientName: string | null }
type OpposingUpload = {
  filePath: string
  originalName: string
  mimeType: string | null
  docType: string | null
  uploadedByName: string | null
}

/**
 * Copy an opposing party's upload onto the case file. Without this it lived
 * only on the request, so the attorney's All files never showed it. Re-filing
 * the same bytes is a no-op: `fileClaimantEvidence` deduplicates on content hash.
 * Returns the new evidence file's id, or null when nothing was filed.
 */
export async function fileOpposingPartyUpload(
  assessmentId: string,
  docRequest: OpposingRequest,
  upload: OpposingUpload,
  options: { maxBytes?: number } = {},
): Promise<string | null> {
  if (!(await ensureLocalCopy(upload.filePath))) return null
  const ownerUserId = await ensureCaseOwnerUserId(assessmentId)
  if (!ownerUserId) return null
  const result = await fileClaimantEvidence({
    maxBytes: options.maxBytes,
    assessmentId,
    ownerUserId,
    buffer: fs.readFileSync(upload.filePath),
    contentType: upload.mimeType || 'application/octet-stream',
    originalName: upload.originalName,
    category: (upload.docType && OPPOSING_DOC_CATEGORY[upload.docType]) || undefined,
    uploadMethod: 'upload_link',
    provenanceSource: opposingProvenance(docRequest.id),
    provenanceActor: 'opposing_party',
    provenanceNotes: `Uploaded by ${upload.uploadedByName || docRequest.recipientName || 'the other side'} through a secure document request.`,
  })
  if (result.status !== 'filed') return null
  fanOutCaseUpdates(assessmentId, [result.filed])
  return result.evidenceFileId
}

/**
 * File opposing-party uploads that arrived before they were copied onto the
 * case. Only requests with more uploads than filed evidence are touched, so a
 * case with nothing outstanding costs two queries.
 */
export async function fileOutstandingOpposingUploads(leadId: string, assessmentId: string): Promise<number> {
  const requests = await prisma.documentRequest.findMany({
    where: { leadId, targetType: 'opposing_party', insuranceDetailId: null },
    select: { id: true, recipientName: true, recipientRole: true, externalUploads: true },
  })
  const withUploads = requests.filter((r) => r.externalUploads.length > 0)
  if (withUploads.length === 0) return 0

  const filedCounts = await prisma.evidenceFile.groupBy({
    by: ['provenanceSource'],
    where: { assessmentId, provenanceSource: { in: withUploads.map((r) => opposingProvenance(r.id)) } },
    _count: { _all: true },
  })
  const filedBySource = new Map(filedCounts.map((row) => [row.provenanceSource, row._count._all]))

  let filed = 0
  for (const request of withUploads) {
    if ((filedBySource.get(opposingProvenance(request.id)) || 0) >= request.externalUploads.length) continue
    for (const upload of request.externalUploads) {
      try {
        const maxBytes = maxUploadBytesForRole(request.recipientRole)
        if (await fileOpposingPartyUpload(assessmentId, request, upload, { maxBytes })) filed += 1
      } catch (error: any) {
        logger.warn('Failed to backfill opposing-party upload', { error: error?.message, requestId: request.id })
      }
    }
  }
  return filed
}
