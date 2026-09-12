/**
 * Extraction is kicked off as a detached promise, so a deploy mid-OCR loses it.
 * That was survivable while every document arrived by upload — the claimant
 * still had the file. A texted document has no such backstop: the client was
 * told it was received and will not send it again.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => import('../test/universalPrismaMock'))
vi.mock('./logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
vi.mock('./evidence-processing', () => ({
  processEvidenceFileForExtraction: vi.fn().mockResolvedValue({}),
}))

import { prisma } from './prisma'
import { resetUniversalPrismaMock } from '../test/universalPrismaMock'
import { processEvidenceFileForExtraction } from './evidence-processing'
import { MAX_JOBS_PER_RUN, runEvidenceProcessingSweep, stalledJobs } from './evidence-processing-sweep'

function queued(jobs: Array<{ id: string; evidenceFileId: string; status: string }>) {
  vi.mocked(prisma.evidenceProcessingJob.findMany).mockResolvedValue(jobs as any)
}

beforeEach(() => {
  resetUniversalPrismaMock()
  vi.clearAllMocks()
})

describe('what counts as abandoned', () => {
  it('looks for jobs that stopped reporting, not jobs that are merely slow', async () => {
    await stalledJobs(new Date('2026-09-12T12:00:00Z'))

    const where = vi.mocked(prisma.evidenceProcessingJob.findMany).mock.calls[0][0].where as any
    const [queuedClause, runningClause] = where.OR
    expect(queuedClause.status).toBe('queued')
    expect(runningClause.status).toBe('running')
    // Textract on a long PDF is legitimately slow; a running job gets longer.
    expect(runningClause.startedAt.lt.getTime()).toBeLessThan(queuedClause.createdAt.lt.getTime())
  })

  it('leaves failed jobs alone', async () => {
    await stalledJobs()

    // A job that ran and threw has reached a verdict. Retrying it on a timer
    // would OCR an unreadable photo every fifteen minutes forever.
    const where = vi.mocked(prisma.evidenceProcessingJob.findMany).mock.calls[0][0].where as any
    expect(JSON.stringify(where.OR)).not.toContain('failed')
  })

  it('skips jobs whose file already finished', async () => {
    await stalledJobs()

    // Stale bookkeeping. Reprocessing would overwrite good extraction.
    const where = vi.mocked(prisma.evidenceProcessingJob.findMany).mock.calls[0][0].where as any
    expect(where.evidenceFile.processingStatus.in).toEqual(['pending', 'processing'])
  })

  it('takes a bounded batch', async () => {
    await stalledJobs()

    expect(vi.mocked(prisma.evidenceProcessingJob.findMany).mock.calls[0][0].take).toBe(MAX_JOBS_PER_RUN)
  })
})

describe('re-driving', () => {
  it('reprocesses each stalled document', async () => {
    queued([
      { id: 'job-1', evidenceFileId: 'ev-1', status: 'running' },
      { id: 'job-2', evidenceFileId: 'ev-2', status: 'queued' },
    ])

    const result = await runEvidenceProcessingSweep()

    expect(result).toEqual({ consideredCount: 2, reprocessedCount: 2, failedCount: 0 })
    expect(processEvidenceFileForExtraction).toHaveBeenCalledWith('ev-1')
    expect(processEvidenceFileForExtraction).toHaveBeenCalledWith('ev-2')
  })

  it('keeps going past a document that will not process', async () => {
    queued([
      { id: 'job-1', evidenceFileId: 'ev-1', status: 'queued' },
      { id: 'job-2', evidenceFileId: 'ev-2', status: 'queued' },
    ])
    vi.mocked(processEvidenceFileForExtraction).mockRejectedValueOnce(new Error('corrupt image'))

    const result = await runEvidenceProcessingSweep()

    // One unreadable photo must not strand every other client's documents.
    expect(result).toEqual({ consideredCount: 2, reprocessedCount: 1, failedCount: 1 })
  })

  it('does nothing when nothing is stuck', async () => {
    queued([])

    expect(await runEvidenceProcessingSweep()).toEqual({
      consideredCount: 0,
      reprocessedCount: 0,
      failedCount: 0,
    })
  })
})
