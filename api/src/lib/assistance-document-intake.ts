/**
 * What happens on the specialist side when a claimant uploads a document.
 *
 * Two things, both of which were missing: the case moves off
 * `document_requested`, and the upload appears on the workbench timeline. Until
 * this existed, a specialist who asked for documents had no signal that they
 * had arrived — the case sat in "Document Requested" and the Activity tab
 * showed only the outbound request, so the only way to find out was to open the
 * Documents tab and compare against what was asked for.
 */
import { prisma } from './prisma'
import { logger } from './logger'
import { DOCUMENT_REQUEST_LABELS, normalizeRequestedDocKey } from './document-request-status'

export type SubmittedFile = {
  originalName?: string | null
  category?: string | null
}

/** "Medical records (bills.pdf)" — the category a specialist asked for, plus the file. */
function describeFile(file: SubmittedFile): string {
  const key = file.category ? normalizeRequestedDocKey(file.category) : ''
  const label = key ? DOCUMENT_REQUEST_LABELS[key] || null : null
  const name = (file.originalName || '').trim()
  if (label && name) return `${label} (${name})`
  return label || name || 'Document'
}

/**
 * Log a claimant upload against the assistance case and advance its status.
 *
 * Best-effort by design: this is bookkeeping on the specialist queue, and an
 * upload must never fail because of it. Cases that never entered the queue have
 * no assistance row and are a no-op.
 */
export async function recordAssistanceDocumentSubmission(params: {
  assessmentId: string
  files: SubmittedFile[]
}): Promise<void> {
  const { assessmentId, files } = params
  if (!assessmentId || !files.length) return

  try {
    const assistance = await prisma.caseAssistance.findUnique({
      where: { assessmentId },
      select: { id: true, status: true },
    })
    if (!assistance) return

    await prisma.caseInteraction.create({
      data: {
        assistanceId: assistance.id,
        assessmentId,
        // Its own channel rather than `other`: the Communications tab lists calls
        // and messages, and an upload is neither, but it still belongs on the
        // full activity timeline.
        channel: 'document',
        direction: 'inbound',
        outcome: 'received',
        notes: `Claimant uploaded: ${files.map(describeFile).join(', ')}`,
      },
    })

    // Only ever advance out of the state the request itself created. A case
    // already handed to attorneys, or one the claimant denied, must not be
    // dragged back into the queue by a late or incidental upload.
    if (assistance.status === 'document_requested') {
      await prisma.caseAssistance.update({
        where: { id: assistance.id },
        data: { status: 'document_submitted' },
      })
      logger.info('Claimant documents arrived; case moved to document_submitted', {
        assessmentId,
        assistanceId: assistance.id,
        files: files.length,
      })
    }
  } catch (error) {
    logger.warn('Could not record a claimant document submission', { assessmentId, error })
  }
}
