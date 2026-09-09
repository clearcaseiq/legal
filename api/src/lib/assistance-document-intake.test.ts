/**
 * What a claimant's upload does to the specialist queue.
 *
 * The two things that must not happen: an upload silently leaving the case in
 * "Document Requested" with no trace on the timeline (the bug this fixes), and
 * a late upload dragging a case that already moved on back into the queue.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { recordAssistanceDocumentSubmission } from './assistance-document-intake'

function assistanceIs(status: string | null) {
  prisma.caseAssistance.findUnique.mockResolvedValue(status === null ? null : { id: 'ca-1', status })
}

beforeEach(() => {
  vi.clearAllMocks()
  resetUniversalPrismaMock()
})

describe('recordAssistanceDocumentSubmission', () => {
  it('logs the upload and advances a case that was waiting on documents', async () => {
    assistanceIs('document_requested')

    await recordAssistanceDocumentSubmission({
      assessmentId: 'assess-1',
      files: [{ originalName: 'bills.pdf', category: 'medical_records' }],
    })

    expect(prisma.caseInteraction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assistanceId: 'ca-1',
        assessmentId: 'assess-1',
        channel: 'document',
        direction: 'inbound',
        outcome: 'received',
        notes: 'Claimant uploaded: Medical records (bills.pdf)',
      }),
    })
    expect(prisma.caseAssistance.update).toHaveBeenCalledWith({
      where: { id: 'ca-1' },
      data: { status: 'document_submitted' },
    })
  })

  it('names every file in one entry rather than one entry per file', async () => {
    // Six photos in a batch should read as one arrival, not bury the history.
    assistanceIs('document_requested')

    await recordAssistanceDocumentSubmission({
      assessmentId: 'assess-1',
      files: [
        { originalName: 'report.pdf', category: 'police_report' },
        { originalName: 'crash.jpg', category: 'injury_photos' },
      ],
    })

    expect(prisma.caseInteraction.create).toHaveBeenCalledTimes(1)
    expect(prisma.caseInteraction.create.mock.calls[0][0].data.notes).toBe(
      'Claimant uploaded: Police/incident report (report.pdf), Injury photos (crash.jpg)',
    )
  })

  it('records the upload but leaves a case that already moved on where it is', async () => {
    // A claimant adding a photo after handover must not pull the case back out
    // of attorney review.
    assistanceIs('ready_for_attorney_review')

    await recordAssistanceDocumentSubmission({
      assessmentId: 'assess-1',
      files: [{ originalName: 'extra.jpg', category: 'photos' }],
    })

    expect(prisma.caseInteraction.create).toHaveBeenCalled()
    expect(prisma.caseAssistance.update).not.toHaveBeenCalled()
  })

  it('does nothing for a case that never entered the specialist queue', async () => {
    assistanceIs(null)

    await recordAssistanceDocumentSubmission({
      assessmentId: 'assess-1',
      files: [{ originalName: 'bills.pdf', category: 'bills' }],
    })

    expect(prisma.caseInteraction.create).not.toHaveBeenCalled()
    expect(prisma.caseAssistance.update).not.toHaveBeenCalled()
  })

  it('never lets its own failure escape into the upload request', async () => {
    prisma.caseAssistance.findUnique.mockRejectedValue(new Error('db down'))

    await expect(
      recordAssistanceDocumentSubmission({
        assessmentId: 'assess-1',
        files: [{ originalName: 'bills.pdf', category: 'bills' }],
      }),
    ).resolves.toBeUndefined()
  })

  it('falls back to the filename when the category means nothing', async () => {
    assistanceIs('in_progress')

    await recordAssistanceDocumentSubmission({
      assessmentId: 'assess-1',
      files: [{ originalName: 'scan001.pdf', category: 'other' }],
    })

    expect(prisma.caseInteraction.create.mock.calls[0][0].data.notes).toBe(
      'Claimant uploaded: Other documents (scan001.pdf)',
    )
  })
})
