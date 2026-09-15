/**
 * The wiring, rather than the comparison.
 *
 * `claimant-identity-check.test.ts` covers what counts as a mismatch. What this
 * covers is that a mismatch actually reaches the row and drags the file into
 * review — the part that would break silently, because a document filed against
 * the wrong claimant looks exactly like a correctly filed one until someone
 * reads the verdict.
 *
 * Driven through a `text/plain` document so the whole path runs for real
 * without Tesseract: the file is read off disk, the name is extracted from its
 * text, and the verdict is written by the same code any upload would take.
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./case-recalculation', () => ({ runCaseRecalculation: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./evidence-vision', () => ({
  analyzeImageRelevance: vi.fn().mockResolvedValue(null),
  shouldFlagForReview: vi.fn().mockReturnValue(false),
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { processEvidenceFileForExtraction } from './evidence-processing'

let tempDir: string
let filePath: string

/**
 * A document that is unremarkable apart from who it names.
 *
 * The date of service matters to the test: a medical record with no readable
 * date is low-confidence on its own and lands in review regardless, which would
 * make "the mismatch pulled it into review" true for the wrong reason. With a
 * date, the name is the only thing that can flip it.
 */
function writeDocument(patientName: string): string {
  filePath = path.join(tempDir, 'record.txt')
  fs.writeFileSync(filePath, `Patient Name: ${patientName}\nDate of Service: 03/04/2024`, 'utf8')
  return filePath
}

/** The case this document lands on, owned by Dana Reyes. */
function caseBelongsToDanaReyes() {
  vi.mocked(prisma.assessment.findUnique).mockResolvedValue({
    facts: JSON.stringify({ plaintiffContext: { firstName: 'Dana', lastName: 'Reyes' } }),
    user: { firstName: null, lastName: null },
  } as any)
}

function evidenceRow(overrides: { category?: string } = {}) {
  vi.mocked(prisma.evidenceFile.findUnique).mockResolvedValue({
    id: 'ev-1',
    assessmentId: 'asm-1',
    originalName: 'record.txt',
    filePath,
    mimetype: 'text/plain',
    category: overrides.category ?? 'medical_records',
    uploadMethod: 'upload_link',
    visionLabels: null,
    processingJobs: [{ id: 'job-1', status: 'queued' }],
  } as any)
}

/** The `evidenceFile.update` inside the completion transaction, not the earlier
 * "processing" one. */
function completionUpdate() {
  const calls = vi.mocked(prisma.evidenceFile.update).mock.calls
  return calls.map((call: any[]) => call[0]?.data).find((data: any) => data && 'identityCheck' in data)
}

function extractedDataWritten() {
  const calls = vi.mocked(prisma.extractedData.create).mock.calls
  return calls[0]?.[0]?.data
}

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.clearAllMocks()
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'identity-check-'))
})

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true })
})

describe('a document naming someone other than the claimant', () => {
  beforeEach(() => {
    writeDocument('Peter Okafor')
    caseBelongsToDanaReyes()
    evidenceRow()
  })

  it('records the conflict against the file with both names', async () => {
    await processEvidenceFileForExtraction('ev-1')

    expect(JSON.parse(completionUpdate()?.identityCheck)).toMatchObject({
      verdict: 'mismatch',
      documentName: 'Peter Okafor',
      claimantName: 'Dana Reyes',
    })
  })

  it('pulls the file into review, which is the only thing the verdict does', async () => {
    await processEvidenceFileForExtraction('ev-1')

    expect(extractedDataWritten()?.isManualReview).toBe(true)
  })

  it('still files the document — a mismatch is a flag, never a rejection', async () => {
    await expect(processEvidenceFileForExtraction('ev-1')).resolves.toBeTruthy()

    expect(completionUpdate()?.processingStatus).toBe('completed')
  })
})

describe('a document naming the claimant', () => {
  it('records the match and leaves the file out of review', async () => {
    writeDocument('Dana Reyes')
    caseBelongsToDanaReyes()
    evidenceRow()

    await processEvidenceFileForExtraction('ev-1')

    expect(JSON.parse(completionUpdate()?.identityCheck)?.verdict).toBe('match')
    expect(extractedDataWritten()?.isManualReview).toBe(false)
  })
})

describe('a document nothing can be concluded about', () => {
  it('stores no verdict for a category that names several people', async () => {
    writeDocument('Peter Okafor')
    caseBelongsToDanaReyes()
    evidenceRow({ category: 'police_report' })

    await processEvidenceFileForExtraction('ev-1')

    expect(completionUpdate()?.identityCheck).toBeNull()
  })
})
